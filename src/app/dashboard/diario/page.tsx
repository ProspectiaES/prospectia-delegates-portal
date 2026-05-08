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

function notaCircleStyle(nota: number | null): string {
  if (!nota) return "border border-[#1a1a1a] text-[#2a2a2a]";
  if (nota >= 5) return "bg-emerald-800/60 text-emerald-300/90 border border-emerald-700/30";
  if (nota >= 4) return "bg-emerald-900/40 text-emerald-400/70 border border-emerald-800/20";
  if (nota >= 3) return "bg-amber-900/40 text-amber-400/70 border border-amber-800/20";
  if (nota >= 2) return "bg-orange-900/30 text-orange-400/60 border border-orange-800/20";
  return "bg-red-900/30 text-red-400/60 border border-red-800/20";
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
      <p className="text-[9px] font-bold text-[#252220] uppercase tracking-[0.25em]">
        {MONTHS_CA[month]}
      </p>
      <div className="grid grid-cols-7 gap-px">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
          const nota = entries.get(iso) ?? null;
          const hasEntry = entries.has(iso);

          return (
            <Link key={iso} href={`/dashboard/diario/${iso}`}
              className={[
                "flex items-center justify-center w-5 h-5 text-[9px] font-medium transition-all hover:scale-110",
                hasEntry
                  ? nota && nota >= 4 ? "text-emerald-500/70"
                    : nota && nota >= 3 ? "text-amber-500/70"
                    : nota ? "text-red-500/70"
                    : "text-[#444]"
                  : "text-[#222] hover:text-[#444]",
                isToday ? "underline" : "",
              ].join(" ")}
            >
              {day}
            </Link>
          );
        })}
      </div>
    </div>
  );
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

  // Streak
  let streak = 0;
  const sc = new Date(today);
  while (entriesMap.has(isoDate(sc))) {
    streak++;
    sc.setDate(sc.getDate() - 1);
  }

  // Current week
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
    ? `${wStart.getDate()}–${wEnd.getDate()} ${MONTHS_CA[wEnd.getMonth()].toLowerCase()}`
    : `${wStart.getDate()} ${MONTHS_CA[wStart.getMonth()].toLowerCase()} – ${wEnd.getDate()} ${MONTHS_CA[wEnd.getMonth()].toLowerCase()}`;

  // Date label
  const weekdayLabel = today.toLocaleDateString("ca-ES", { weekday: "long" });

  // State of Command
  const command = [
    { label: "Claredat",    value: avgNota > 0 ? avgNota.toFixed(1) : "–", sub: avgNota > 0 ? "de 5" : "sense dades" },
    { label: "Energia",     value: streak > 0 ? String(streak) : "0",      sub: streak === 1 ? "dia" : "dies" },
    { label: "Coherència",  value: `${weekDone}`,                           sub: `de 7 dies` },
    { label: "Direcció",    value: String(totalEntries),                    sub: totalEntries === 1 ? "entrada" : "entrades" },
  ];

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "#050505",
        backgroundImage: "radial-gradient(ellipse at 20% 20%, rgba(107,15,26,0.07) 0%, transparent 55%), radial-gradient(ellipse at 80% 85%, rgba(184,112,64,0.03) 0%, transparent 50%)",
      }}
    >
      <div className="max-w-5xl mx-auto px-8 md:px-14 lg:px-20 py-14 md:py-20 space-y-16">

        {/* ── Date line ── */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-[0.35em]"
            style={{ color: "#2A2520" }}>
            {weekdayLabel} · {today.getDate()} de {MONTHS_CA[today.getMonth()]} · {today.getFullYear()}
          </p>
          <Link
            href={`/dashboard/diario/${todayIso}`}
            className="text-[10px] font-bold uppercase tracking-[0.3em] transition-colors"
            style={{ color: "#6B1020" }}
            onMouseEnter={undefined}
          >
            ↗ Avui
          </Link>
        </div>

        {/* ── Hero phrase ── */}
        <div>
          <h1
            className="font-black leading-[0.9] tracking-[-0.025em]"
            style={{
              fontSize: "clamp(48px, 7vw, 88px)",
              color: "#EDE8DF",
            }}
          >
            Planifico,<br />
            executo i assoliré<br />
            <span style={{ color: "#7D1120" }}>cada objectiu</span><br />
            fixat.
          </h1>
          <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.35em]"
            style={{ color: "#2A2520" }}>
            Setmana {currentWeek} · {weekRangeLabel}
          </p>
        </div>

        {/* ── Hairline ── */}
        <div style={{ height: "1px", backgroundColor: "#111" }} />

        {/* ── State of Command ── */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.4em] mb-8"
            style={{ color: "#1A1815" }}>
            State of Command
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
            {command.map((m, i) => (
              <div
                key={m.label}
                className={`pr-8 ${i > 0 ? "pl-8 border-l" : ""} ${i >= 2 ? "mt-8 md:mt-0" : ""}`}
                style={{ borderColor: "#111" }}
              >
                <p className="text-[8px] font-bold uppercase tracking-[0.35em] mb-3"
                  style={{ color: "#252220" }}>
                  {m.label}
                </p>
                <p className="text-[42px] font-black leading-none tabular-nums"
                  style={{ color: "#EDE8DF", fontVariantNumeric: "tabular-nums" }}>
                  {m.value}
                </p>
                <p className="text-[9px] mt-1.5"
                  style={{ color: "#2A2520" }}>
                  {m.sub}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Hairline ── */}
        <div style={{ height: "1px", backgroundColor: "#111" }} />

        {/* ── Today entry CTA ── */}
        <Link
          href={`/dashboard/diario/${todayIso}`}
          className="group flex items-center justify-between py-2 transition-all duration-300"
        >
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.4em] mb-2 transition-colors"
              style={{ color: "#252220" }}>
              Centre operatiu
            </p>
            <p className="text-[26px] font-black transition-colors"
              style={{ color: "#EDE8DF" }}>
              Entrada d&apos;avui
            </p>
          </div>
          <span
            className="text-[32px] font-thin transition-colors duration-300"
            style={{ color: "#252220" }}
          >
            →
          </span>
        </Link>

        {/* ── Hairline ── */}
        <div style={{ height: "1px", backgroundColor: "#111" }} />

        {/* ── Week view ── */}
        <div>
          <div className="flex items-baseline justify-between mb-8">
            <p className="text-[9px] font-bold uppercase tracking-[0.4em]"
              style={{ color: "#1A1815" }}>
              Setmana {currentWeek}
            </p>
            <Link
              href={`/dashboard/diario/setmana/${year}/${currentWeek}`}
              className="text-[9px] font-medium uppercase tracking-[0.3em] transition-colors"
              style={{ color: "#252220" }}
            >
              Revisió →
            </Link>
          </div>

          <div className="grid grid-cols-7 gap-3 md:gap-6">
            {weekEntries.map(({ day, idx, iso, nota, hasEntry, isToday, isFuture }) => (
              <Link
                key={iso}
                href={`/dashboard/diario/${iso}`}
                className="group flex flex-col items-center gap-3"
              >
                <span className="text-[8px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: "#252220" }}>
                  {DAYS_SHORT[idx]}
                </span>
                <div
                  className={[
                    "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-black transition-all group-hover:scale-105",
                    isToday
                      ? "text-white"
                      : hasEntry
                        ? notaCircleStyle(nota)
                        : isFuture
                          ? ""
                          : "border text-[#222] hover:text-[#333]",
                  ].join(" ")}
                  style={isToday ? { backgroundColor: "#7D1120", boxShadow: "0 0 20px rgba(125,17,32,0.4)" } : {}}
                >
                  <span className="text-[13px]">{day.getDate()}</span>
                </div>
                {hasEntry && nota && (
                  <span className="text-[9px] tabular-nums" style={{ color: "#252220" }}>
                    {nota}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Hairline ── */}
        <div style={{ height: "1px", backgroundColor: "#111" }} />

        {/* ── Governador ── */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.4em] mb-6"
            style={{ color: "#1A1815" }}>
            Intel·ligència Personal
          </p>
          <Link href="/dashboard/diario/governador" className="group flex items-center justify-between">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.3em] mb-1"
                style={{ color: "#7D1120" }}>
                Sistema actiu
              </p>
              <p className="text-[20px] font-black"
                style={{ color: "#EDE8DF" }}>
                El Governador <span className="font-light transition-colors group-hover:text-[#C4964A]"
                  style={{ color: "#252220" }}>→</span>
              </p>
              <p className="text-[10px] mt-1"
                style={{ color: "#3D3530" }}>
                Focus · Seguiment · Coherència · Entrenament
              </p>
            </div>
          </Link>
        </div>

        {/* ── Hairline ── */}
        <div style={{ height: "1px", backgroundColor: "#111" }} />

        {/* ── Planificació ── */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.4em] mb-8"
            style={{ color: "#1A1815" }}>
            Planificació d&apos;Alt Rendiment · 2026
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-6">
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
              <Link key={l.href} href={l.href} className="group block">
                <p className="text-[8px] font-bold uppercase tracking-[0.3em] mb-1 transition-colors"
                  style={{ color: "#252220" }}>
                  {l.sub}
                </p>
                <p className="text-[15px] font-black transition-colors"
                  style={{ color: "#EDE8DF" }}>
                  {l.label} <span className="font-light text-[#252220] group-hover:text-[#7D1120] transition-colors">→</span>
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Hairline ── */}
        <div style={{ height: "1px", backgroundColor: "#111" }} />

        {/* ── Archive (collapsible) ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <Link href={`/dashboard/diario?year=${year - 1}`}
                className="text-[10px] transition-colors" style={{ color: "#252220" }}>
                ←
              </Link>
              <p className="text-[9px] font-bold uppercase tracking-[0.4em]"
                style={{ color: "#1A1815" }}>
                Arxiu · {year}
              </p>
              <Link href={`/dashboard/diario?year=${year + 1}`}
                className="text-[10px] transition-colors" style={{ color: "#252220" }}>
                →
              </Link>
            </div>
            <span className="text-[9px]" style={{ color: "#252220" }}>
              {totalEntries} entrades
            </span>
          </div>

          <details className="group">
            <summary className="cursor-pointer list-none select-none py-3 flex items-center gap-3">
              <div style={{ height: "1px", flex: 1, backgroundColor: "#0E0E0E" }} />
              <span className="text-[9px] font-bold uppercase tracking-[0.35em] group-open:opacity-50 transition-opacity"
                style={{ color: "#1E1C1A" }}>
                Veure calendari
              </span>
              <div style={{ height: "1px", flex: 1, backgroundColor: "#0E0E0E" }} />
            </summary>

            <div className="pt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8">
              {Array.from({ length: 12 }, (_, m) => (
                <ArchiveMonth key={m} year={year} month={m} entries={entriesMap} today={today} />
              ))}
            </div>
          </details>
        </div>

        {/* Bottom spacer */}
        <div style={{ height: "60px" }} />

      </div>
    </div>
  );
}
