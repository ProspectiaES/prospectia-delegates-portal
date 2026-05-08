import { GarminConnect } from "garmin-connect";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GarminDayData {
  son_hores:      number | null;
  energia:        number | null;  // 1-5, from Body Battery morning value
  serenitat:      number | null;  // 1-5, from stress (inverted)
  rhr:            number | null;  // resting heart rate (bpm, informational)
  passos:         number | null;  // total steps
  running_km:     number | null;  // activity distance in km
  running_min:    number | null;  // activity duration in minutes
  act_fc_mit:     number | null;  // activity avg HR (bpm)
  act_fc_max:     number | null;  // activity max HR (bpm)
  activitat_tipus: string | null; // activity type key mapped to our options
  origen:         string[];       // which fields were actually fetched
}

function mapActivityType(typeKey: string | undefined): string {
  const k = (typeKey ?? "").toLowerCase();
  if (k.includes("running") || k === "run") return "running";
  if (k.includes("cycling") || k.includes("bike") || k === "biking") return "ciclisme";
  if (k.includes("swim")) return "natacio";
  if (k.includes("walk") || k.includes("hiking")) return "caminar";
  if (k.includes("strength") || k.includes("gym") || k.includes("fitness")) return "gimnàs";
  if (k.includes("yoga") || k.includes("mobility") || k.includes("pilates")) return "mobilitat";
  return "altra";
}

// ─── Client singleton (persists across PM2 process lifetime) ──────────────────

let gc: GarminConnect | null = null;
let lastLogin = 0;
const LOGIN_TTL = 6 * 60 * 60 * 1000; // 6 hours

async function getClient(): Promise<GarminConnect> {
  const email    = process.env.GARMIN_EMAIL;
  const password = process.env.GARMIN_PASSWORD;
  if (!email || !password) throw new Error("GARMIN_EMAIL / GARMIN_PASSWORD not set in env");

  const now = Date.now();
  if (!gc || now - lastLogin > LOGIN_TTL) {
    gc = new GarminConnect({ username: email, password });
    await gc.login();
    lastLogin = now;
  }
  return gc;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scale100to5(val: number): number {
  return Math.max(1, Math.min(5, Math.ceil(val / 20)));
}

// ─── Main fetcher ─────────────────────────────────────────────────────────────

export async function fetchGarminDay(dateStr: string): Promise<GarminDayData> {
  const client = await getClient();
  const date   = new Date(dateStr + "T12:00:00");

  const out: GarminDayData = {
    son_hores: null, energia: null, serenitat: null, rhr: null, passos: null,
    running_km: null, running_min: null,
    act_fc_mit: null, act_fc_max: null, activitat_tipus: null,
    origen: [],
  };

  // ── Sleep duration ──
  try {
    const dur = await client.getSleepDuration(date) as { hours: number; minutes: number };
    if (dur?.hours != null) {
      out.son_hores = Math.round((dur.hours + (dur.minutes ?? 0) / 60) * 2) / 2;
      out.origen.push("son");
    }
  } catch { /* watch not synced or no data */ }

  // ── Resting heart rate ──
  try {
    const hr = await client.getHeartRate(date) as { restingHeartRate?: number };
    if (hr?.restingHeartRate) {
      out.rhr = hr.restingHeartRate;
      out.origen.push("fc");
    }
  } catch { /* */ }

  // ── Daily stress → serenitat (inverted) ──
  try {
    const url = `https://connectapi.garmin.com/wellness-service/wellness/dailyStress/${dateStr}`;
    const stress = await client.get(url) as { overallStressLevel?: number };
    if (stress?.overallStressLevel != null && stress.overallStressLevel > 0) {
      // stress 0-100: higher = more stressed → invert for serenitat
      out.serenitat = 6 - scale100to5(stress.overallStressLevel);
      out.origen.push("estrès");
    }
  } catch { /* */ }

  // ── Body Battery (morning peak) → energia ──
  try {
    const url  = `https://connectapi.garmin.com/wellness-service/wellness/bodyBattery/events?startDate=${dateStr}&endDate=${dateStr}`;
    const bb   = await client.get(url) as { bodyBatteryLevel?: number; level?: number }[];
    if (Array.isArray(bb) && bb.length > 0) {
      // Take the highest value of the day (typically morning after sleep)
      const max = Math.max(...bb.map(e => e.bodyBatteryLevel ?? e.level ?? 0));
      if (max > 0) {
        out.energia = scale100to5(max);
        out.origen.push("body battery");
      }
    }
  } catch { /* */ }

  // ── Steps ──
  try {
    const steps = await client.getSteps(date) as number;
    if (steps != null) {
      out.passos = steps;
      out.origen.push("passos");
    }
  } catch { /* */ }

  // ── Activity (running, cycling, any sport) ──
  try {
    const activities = await client.getActivities(0, 10) as Array<{
      startTimeLocal?: string;
      activityType?: { typeKey?: string };
      distance?: number;
      duration?: number;
      averageHR?: number;
      maxHR?: number;
    }>;
    if (Array.isArray(activities)) {
      const act = activities.find(a => {
        const actDate = (a.startTimeLocal ?? "").slice(0, 10);
        return actDate === dateStr;
      });
      if (act) {
        if (act.distance != null && act.distance > 0)
          out.running_km = Math.round((act.distance / 1000) * 100) / 100;
        if (act.duration != null && act.duration > 0)
          out.running_min = Math.round(act.duration / 60);
        if (act.averageHR != null && act.averageHR > 0)
          out.act_fc_mit = Math.round(act.averageHR);
        if (act.maxHR != null && act.maxHR > 0)
          out.act_fc_max = Math.round(act.maxHR);
        out.activitat_tipus = mapActivityType(act.activityType?.typeKey);
        out.origen.push(out.activitat_tipus ?? "activitat");
      }
    }
  } catch { /* */ }

  return out;
}
