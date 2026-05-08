import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { getDiarioCalendar } from "@/app/actions/diario";
import { getFraseSetmana } from "@/lib/diario-constants";

const MONTHS_CA = [
  "Gener", "Febrer", "Març", "Abril", "Maig", "Juny",
  "Juliol", "Agost", "Setembre", "Octubre", "Novembre", "Desembre",
];
const DAYS_SHORT = ["Dl", "Dt", "Dc", "Dj", "Dv", "Ds", "Dg"];

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  text:      "#1C1510",
  textDim:   "#5C5048",
  label:     "#9A8E82",
  border:    "#E4DDD5",
  accent:    "#7D1120",
  accentBg:  "#F9F2F0",
  copper:    "#A87830",
  card:      "#FFFFFF",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getWeekDays(today: Date): Date[] {
  const monday = new Date(today);
  const dow = (today.getDay() + 6) % 7;
  monday.setDate(today.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

// ─── Mini month calendar ──────────────────────────────────────────────────────

function ArchiveMonth({ year, month, entries, today }: {
  year: number; month: number;
  entries: Map<string, number | null>;
  today: Date;
}) {
  const firstDay = new Date(year, month, 1);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: C.label }}>
        {MONTHS_CA[month]}
      </p>
      <div className="grid grid-cols-7 gap-px">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
          const nota = entries.get(iso) ?? null;
          const hasEntry = entries.has(iso);
          const color = !hasEntry ? "#C0B4A8"
            : nota && nota >= 4 ? "#2A7A4A"
            : nota && nota >= 3 ? "#A07020"
            : nota ? "#9A2020"
            : C.textDim;

          return (
            <Link key={iso} href={`/dashboard/diario/${iso}`}
              className="flex items-center justify-center w-5 h-5 text-[9px] font-medium transition-all hover:scale-110"
              style={{
                color,
                fontWeight: isToday ? 800 : 500,
                textDecoration: isToday ? "underline" : "none",
              }}
            >
              {day}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Hairline ─────────────────────────────────────────────────────────────────

function HR() {
  return <div style={{ height: "1px", backgroundColor: C.border }} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DiarioPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const sp = await searchParams;
  const today = new Date();
  const year = parseInt(sp.year ?? "") || today.getFullYear();
  const todayIso = isoDate(today);

  const { setmana: currentWeek } = getFraseSetmana();
  const calData = await getDiarioCalendar(year);
  const entriesMap = new Map(calData.map(e => [e.fecha, e.nota_dia]));

  const totalEntries = calData.length;
  const notedEntries = calData.filter(e => e.nota_dia);
  const avgNota = notedEntries.length > 0
    ? notedEntries.reduce((a, e) => a + (e.nota_dia ?? 0), 0) / notedEntries.length
    : 0;

  let streak = 0;
  const sc = new Date(today);
  while (entriesMap.has(isoDate(sc))) { streak++; sc.setDate(sc.getDate() - 1); }

  const weekDays = getWeekDays(today);
  const weekEntries = weekDays.map((day, idx) => ({
    day, idx,
    iso: isoDate(day),
    nota: entriesMap.get(isoDate(day)) ?? null,
    hasEntry: entriesMap.has(isoDate(day)),
    isToday: isoDate(day) === todayIso,
    isFuture: isoDate(day) > todayIso,
  }));
  const weekDone = weekEntries.filter(e => e.hasEntry).length;

  const wStart = weekDays[0];
  const wEnd = weekDays[6];
  const sameMonth = wStart.getMonth() === wEnd.getMonth();
  const weekRangeLabel = sameMonth
    ? `${wStart.getDate()}–${wEnd.getDate()} ${MONTHS_CA[wEnd.getMonth()]}`
    : `${wStart.getDate()} ${MONTHS_CA[wStart.getMonth()]} – ${wEnd.getDate()} ${MONTHS_CA[wEnd.getMonth()]}`;

  const weekdayLabel = today.toLocaleDateString("ca-ES", { weekday: "long" });

  const command = [
    { label: "Claredat",   value: avgNota > 0 ? avgNota.toFixed(1) : "–", sub: avgNota > 0 ? "nota mitja" : "sense dades" },
    { label: "Energia",    value: streak > 0 ? String(streak) : "0",      sub: streak === 1 ? "dia de ratxa" : "dies de ratxa" },
    { label: "Coherència", value: `${weekDone}/7`,                         sub: "dies aquesta setmana" },
    { label: "Direcció",   value: String(totalEntries),                    sub: totalEntries === 1 ? "entrada al diari" : "entrades al diari" },
  ];

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-10 py-10 space-y-10">

      {/* ── Cap de pàgina ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] capitalize"
            style={{ color: C.label }}>
            {weekdayLabel}, {today.getDate()} {MONTHS_CA[today.getMonth()]} {today.getFullYear()}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: C.label }}>
            Setmana {currentWeek} · {weekRangeLabel}
          </p>
        </div>
        <Link
          href={`/dashboard/diario/${todayIso}`}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-semibold transition-colors"
          style={{ backgroundColor: C.accent, color: "#FFF" }}
        >
          Avui →
        </Link>
      </div>

      {/* ── Frase setmanal ── */}
      <div className="rounded-2xl p-6" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: C.label }}>
          Frase de la setmana
        </p>
        <blockquote
          className="font-semibold leading-snug"
          style={{ fontSize: "clamp(16px, 2.2vw, 22px)", color: C.text }}
        >
          Planifico, executo i assoliré{" "}
          <span style={{ color: C.accent }}>cada objectiu</span> fixat.
        </blockquote>
      </div>

      {/* ── State of Command ── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: C.label }}>
          Estat del comandament
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {command.map((m) => (
            <div key={m.label}
              className="rounded-xl p-4"
              style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-2"
                style={{ color: C.label }}>
                {m.label}
              </p>
              <p className="text-[28px] font-black leading-none tabular-nums mb-1"
                style={{ color: C.text }}>
                {m.value}
              </p>
              <p className="text-[10px]" style={{ color: C.label }}>
                {m.sub}
              </p>
            </div>
          ))}
        </div>
      </div>

      <HR />

      {/* ── Setmana actual ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: C.label }}>
            Setmana {currentWeek}
          </p>
          <Link href={`/dashboard/diario/setmana/${year}/${currentWeek}`}
            className="text-[10px] font-semibold transition-colors hover:underline"
            style={{ color: C.accent }}>
            Revisió →
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekEntries.map(({ day, idx, iso, nota, hasEntry, isToday, isFuture }) => {
            const notaColor = !nota ? C.border
              : nota >= 4 ? "#2A7A4A"
              : nota >= 3 ? "#A07020"
              : "#9A2020";
            return (
              <Link key={iso} href={`/dashboard/diario/${iso}`}
                className="group flex flex-col items-center gap-1.5 py-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em]"
                  style={{ color: C.label }}>
                  {DAYS_SHORT[idx]}
                </span>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold transition-all group-hover:scale-105"
                  style={isToday
                    ? { backgroundColor: C.accent, color: "#FFF" }
                    : hasEntry
                      ? { backgroundColor: notaColor + "20", color: notaColor, border: `1.5px solid ${notaColor}40` }
                      : isFuture
                        ? { border: `1px solid ${C.border}`, color: "#C0B4A8" }
                        : { border: `1px dashed ${C.border}`, color: "#C0B4A8" }
                  }
                >
                  {day.getDate()}
                </div>
                {hasEntry && nota && (
                  <span className="text-[9px] font-semibold tabular-nums"
                    style={{ color: notaColor }}>
                    {nota}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <HR />

      {/* ── Governador ── */}
      <Link href="/dashboard/diario/governador"
        className="group flex items-center justify-between p-5 rounded-2xl transition-all hover:shadow-md"
        style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1"
            style={{ color: C.accent }}>
            Intel·ligència Personal
          </p>
          <p className="text-[17px] font-bold" style={{ color: C.text }}>
            El Governador
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: C.label }}>
            Focus · Seguiment · Coherència · Entrenament
          </p>
        </div>
        <span className="text-[22px] font-thin transition-transform group-hover:translate-x-1"
          style={{ color: C.accent }}>→</span>
      </Link>

      <HR />

      {/* ── Ecosistema Humà ── */}
      <Link href="/dashboard/diario/ecosistema"
        className="group flex items-center justify-between p-5 rounded-2xl transition-all hover:shadow-md"
        style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1"
            style={{ color: C.accent }}>
            Consciència Relacional
          </p>
          <p className="text-[17px] font-bold" style={{ color: C.text }}>
            Ecosistema Humà
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: C.label }}>
            Nucli · Estratègic · Expansió · Drenant
          </p>
        </div>
        <span className="text-[22px] font-thin transition-transform group-hover:translate-x-1"
          style={{ color: C.accent }}>→</span>
      </Link>

      <HR />

      {/* ── Planificació ── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: C.label }}>
          Planificació d&apos;Alt Rendiment · 2026
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: "/dashboard/diario/planificacio/carta",       label: "Carta",       sub: "al jo 2026" },
            { href: "/dashboard/diario/planificacio/missio",      label: "Missió",      sub: "propòsit vital" },
            { href: "/dashboard/diario/planificacio/prioritats",  label: "Prioritats",  sub: "top 5 · 2026" },
            { href: "/dashboard/diario/planificacio/objectius",   label: "Objectius",   sub: "vitals i trimestrals" },
            { href: "/dashboard/diario/planificacio/influencies", label: "Influències", sub: "cercle i referents" },
            { href: "/dashboard/diario/planificacio/desitjos",    label: "Desitjos",    sub: "el que vols crear" },
            { href: "/dashboard/diario/planificacio/frases",      label: "52 Frases",   sub: "una per setmana" },
            { href: `/dashboard/diario/setmana/${year}/${currentWeek}`, label: "Setmana", sub: `revisió ${currentWeek}` },
          ].map(l => (
            <Link key={l.href} href={l.href}
              className="group block p-4 rounded-xl transition-all hover:shadow-sm"
              style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
            >
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] mb-1"
                style={{ color: C.label }}>
                {l.sub}
              </p>
              <p className="text-[14px] font-bold transition-colors group-hover:text-[#7D1120]"
                style={{ color: C.text }}>
                {l.label}
              </p>
            </Link>
          ))}
        </div>
      </div>

      <HR />

      {/* ── Archive ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/diario?year=${year - 1}`}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] transition-colors hover:bg-white"
              style={{ color: C.textDim, border: `1px solid ${C.border}` }}>
              ←
            </Link>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: C.label }}>
              Arxiu · {year}
            </p>
            <Link href={`/dashboard/diario?year=${year + 1}`}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] transition-colors hover:bg-white"
              style={{ color: C.textDim, border: `1px solid ${C.border}` }}>
              →
            </Link>
          </div>
          <span className="text-[10px]" style={{ color: C.label }}>{totalEntries} entrades</span>
        </div>

        <details className="group">
          <summary className="cursor-pointer list-none select-none py-2.5 flex items-center gap-3">
            <div style={{ height: "1px", flex: 1, backgroundColor: C.border }} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] whitespace-nowrap"
              style={{ color: C.label }}>
              Veure calendari
            </span>
            <div style={{ height: "1px", flex: 1, backgroundColor: C.border }} />
          </summary>
          <div className="pt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {Array.from({ length: 12 }, (_, m) => (
              <ArchiveMonth key={m} year={year} month={m} entries={entriesMap} today={today} />
            ))}
          </div>
        </details>
      </div>

      <div style={{ height: "40px" }} />
    </div>
  );
}
