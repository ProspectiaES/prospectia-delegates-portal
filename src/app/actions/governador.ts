"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { redirect } from "next/navigation";
import {
  buildRecentratgePrompt,
  buildSeguimentPrompt,
  buildCoherenciaPrompt,
  buildEntrenadorPrompt,
  type RecentratgeCtx,
  type SeguimentCtx,
  type CoherenciaCtx,
  type EntrenadorCtx,
} from "@/lib/governador-prompts";

// ─── Claude API call ──────────────────────────────────────────────────────────

async function callClaude(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-4-7",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error: ${res.status} ${err}`);
  }

  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  return data.content.find(b => b.type === "text")?.text ?? "";
}

// ─── Context gatherers ────────────────────────────────────────────────────────

async function gatherPlanificacio(userId: string) {
  const supabase = await createClient();
  const year = new Date().getFullYear();

  const [missio, prioritats, objectius, valors] = await Promise.all([
    supabase.from("diario_planificacio").select("contingut").eq("user_id", userId).eq("year_num", year).eq("tipus", "missio").maybeSingle(),
    supabase.from("diario_planificacio").select("contingut").eq("user_id", userId).eq("year_num", year).eq("tipus", "prioritats").maybeSingle(),
    supabase.from("diario_planificacio").select("contingut").eq("user_id", userId).eq("year_num", year).eq("tipus", "objectius").maybeSingle(),
    supabase.from("diario_planificacio").select("contingut").eq("user_id", userId).eq("year_num", year).eq("tipus", "valors").maybeSingle(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mc = missio.data?.contingut as any;
  const missioParsed: string | undefined = mc?.statement;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pc = prioritats.data?.contingut as any;
  const prioritatsParsed: string[] = (pc?.top5 as Array<{ prioritat: string }> | undefined)
    ?.map(r => r.prioritat) ?? [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = objectius.data?.contingut as any;
  const allObj: Array<{ objectiu: string }> = [
    ...((oc?.vitals ?? []) as Array<{ objectiu: string }>),
    ...((oc?.trimestrals ?? []) as Array<{ objectiu: string }>),
  ];
  const objectiusParsed: string[] = allObj.map(o => o.objectiu);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vc = valors.data?.contingut as any;
  const valorsParsed: string[] = (vc?.valors as Array<{ valor: string }> | undefined)
    ?.map(r => r.valor) ?? [];

  return { missio: missioParsed, prioritats: prioritatsParsed, objectius: objectiusParsed, valors: valorsParsed };
}

async function gatherDiariEntries(userId: string, days = 7) {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await supabase
    .from("diario_entries")
    .select("fecha, tasca_clau, reflexio_personal, nota_dia, estat_anim, energia, son_hores, serenitat, running_km, examen_vespre, tasca_completada, disciplina_complerta, criteri_mantingut, disciplina_compromis, espai_lliure, activitats")
    .eq("user_id", userId)
    .gte("fecha", since.toISOString().slice(0, 10))
    .order("fecha", { ascending: false });

  return data ?? [];
}

// ─── Save session ─────────────────────────────────────────────────────────────

async function saveSession(userId: string, mode: string, context: unknown, resposta: string) {
  const supabase = await createClient();
  await supabase.from("governador_sessions").insert({ user_id: userId, mode, context, resposta });
}

// ─── Public actions ───────────────────────────────────────────────────────────

export async function getLastSessions(): Promise<Record<string, { resposta: string; created_at: string } | null>> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const supabase = await createClient();
  const modes = ["recentratge", "seguiment", "coherencia", "entrenador"] as const;

  const results = await Promise.all(
    modes.map(mode =>
      supabase
        .from("governador_sessions")
        .select("resposta, created_at")
        .eq("user_id", profile.id)
        .eq("mode", mode)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    )
  );

  return Object.fromEntries(
    modes.map((mode, i) => [mode, results[i].data as { resposta: string; created_at: string } | null])
  );
}

export async function activarRecentratge(): Promise<{ resposta: string }> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const plan = await gatherPlanificacio(profile.id);
  const entrades = await gatherDiariEntries(profile.id, 14);

  const ctx: RecentratgeCtx = {
    missio: plan.missio,
    prioritats: plan.prioritats,
    objectius: plan.objectius,
    darreres_entrades: entrades.map(e => ({
      fecha: e.fecha,
      tasca_clau: e.tasca_clau,
      reflexio: e.reflexio_personal,
      nota: e.nota_dia,
    })),
  };

  const prompt = buildRecentratgePrompt(ctx);
  const resposta = await callClaude(prompt);
  await saveSession(profile.id, "recentratge", ctx, resposta);
  return { resposta };
}

export async function activarSeguiment(): Promise<{ resposta: string }> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const supabase = await createClient();
  const todayIso = new Date().toISOString().slice(0, 10);
  const hour = new Date().getHours();
  const moment: "mati" | "vespre" = hour < 15 ? "mati" : "vespre";

  const { data: entrada } = await supabase
    .from("diario_entries")
    .select("tasca_clau, estat_anim, energia, nota_dia, examen_vespre")
    .eq("user_id", profile.id)
    .eq("fecha", todayIso)
    .maybeSingle();

  const plan = await gatherPlanificacio(profile.id);

  const ctx: SeguimentCtx = {
    moment,
    te_entrada_avui: !!entrada,
    tasca_clau: entrada?.tasca_clau,
    estat_anim: entrada?.estat_anim,
    energia: entrada?.energia,
    nota_dia: entrada?.nota_dia,
    examen_vespre: entrada?.examen_vespre,
    prioritat_1: plan.prioritats[0],
  };

  const prompt = buildSeguimentPrompt(ctx);
  const resposta = await callClaude(prompt);
  await saveSession(profile.id, "seguiment", ctx, resposta);
  return { resposta };
}

export async function activarCoherencia(): Promise<{ resposta: string }> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const supabase = await createClient();
  const todayIso = new Date().toISOString().slice(0, 10);

  const { data: entrada } = await supabase
    .from("diario_entries")
    .select("tasca_clau, reflexio_personal, disciplina_compromis, espai_lliure, estat_anim, nota_dia, tasca_completada, disciplina_complerta, criteri_mantingut")
    .eq("user_id", profile.id)
    .eq("fecha", todayIso)
    .maybeSingle();

  const plan = await gatherPlanificacio(profile.id);

  const ctx: CoherenciaCtx = {
    entrada_avui: entrada ?? undefined,
    missio: plan.missio,
    valors: plan.valors,
    prioritats: plan.prioritats,
  };

  const prompt = buildCoherenciaPrompt(ctx);
  const resposta = await callClaude(prompt);
  await saveSession(profile.id, "coherencia", ctx, resposta);
  return { resposta };
}

export async function activarEntrenador(): Promise<{ resposta: string }> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const supabase = await createClient();
  const todayIso = new Date().toISOString().slice(0, 10);

  const { data: entrada } = await supabase
    .from("diario_entries")
    .select("energia, son_hores, estat_anim, serenitat, running_km, activitats")
    .eq("user_id", profile.id)
    .eq("fecha", todayIso)
    .maybeSingle();

  // Aggregate running km this week
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const mondayIso = monday.toISOString().slice(0, 10);

  const { data: setmana } = await supabase
    .from("diario_entries")
    .select("running_km, activitats")
    .eq("user_id", profile.id)
    .gte("fecha", mondayIso)
    .lte("fecha", todayIso);

  const kmSetmana = (setmana ?? []).reduce((s, e) => s + (e.running_km ?? 0), 0);
  const diesActivitat = (setmana ?? []).filter(e => (e.running_km ?? 0) > 0 || e.activitats).length;

  // Latest Garmin data
  const { data: garmin } = await supabase
    .from("diario_garmin")
    .select("rhr, passos, running_km")
    .eq("user_id", profile.id)
    .order("data", { ascending: false })
    .limit(1)
    .maybeSingle();

  const ctx: EntrenadorCtx = {
    energia: entrada?.energia,
    son_hores: entrada?.son_hores,
    estat_anim: entrada?.estat_anim,
    serenitat: entrada?.serenitat,
    running_km_setmana: Math.round(kmSetmana * 10) / 10,
    dies_activitat_setmana: diesActivitat,
    ultima_activitat: entrada?.activitats,
    garmin: garmin ? { rhr: garmin.rhr, passos: garmin.passos, running_km: garmin.running_km } : undefined,
  };

  const prompt = buildEntrenadorPrompt(ctx);
  const resposta = await callClaude(prompt);
  await saveSession(profile.id, "entrenador", ctx, resposta);
  return { resposta };
}
