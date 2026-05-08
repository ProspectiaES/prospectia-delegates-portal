import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { getDiarioCalendar } from "@/app/actions/diario";
import { getFraseSetmana } from "@/lib/diario-constants";

const MONTHS_CA = [
  "Gener", "Febrer", "Març", "Abril", "Maig", "Juny",
  "Juliol", "Agost", "Setembre", "Octubre", "Novembre", "Desembre",
];
const DAYS_CA = ["Dl", "Dt", "Dc", "Dj", "Dv", "Ds", "Dg"];

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

function notaGradient(nota: number | null): string {
  if (!nota) return "from-[#1a1a1a] to-[#111]";
  if (nota >= 5) return "from-emerald-600 to-emerald-800";
  if (nota >= 4) return "from-emerald-500 to-emerald-700";
  if (nota >= 3) return "from-amber-500 to-amber-700";
  if (nota >= 2) return "from-orange-500 to-orange-700";
  return "from-red-600 to-red-800";
}

function notaBg(nota: number | null, hasEntry: boolean): string {
  if (!hasEntry) return "bg-[#1C1C1E] text-[#555]";
  if (!nota) return "bg-[#2C2C2E] text-white";
  if (nota >= 5) return "bg-emerald-500 text-white";
  if (nota >= 4) return "bg-emerald-400 text-white";
  if (nota >= 3) return "bg-amber-400 text-white";
  if (nota >= 2) return "bg-orange-400 text-white";
  return "bg-red-500 text-white";
}

function notaCalColor(nota: number | null): string {
  if (!nota) return "bg-[#2A2A2A] text-[#666]";
  if (nota >= 5) return "bg-emerald-500 text-white";
  if (nota >= 4) return "bg-emerald-400 text-white";
  if (nota >= 3) return "bg-amber-400 text-white";
  if (nota >= 2) return "bg-orange-400 text-white";
  return "bg-red-400 text-white";
}

// ─── Month grid ───────────────────────────────────────────────────────────────

function MonthGrid({ year, month, entries, today }: {
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
    <div className="bg-[#141414] rounded-xl border border-[#222] p-3">
      <h3 className="text-[10px] font-bold text-[#555] uppercase tracking-wider mb-2">
        {MONTHS_CA[month]}
      </h3>
      <div className="grid grid-cols-7 gap-px mb-1">
        {DAYS_CA.map(d => (
          <div key={d} className="text-[8px] font-semibold text-[#444] text-center pb-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
          const nota = entries.get(iso) ?? null;
          const hasEntry = entries.has(iso);

          return (
            <Link
              key={iso}
              href={`/dashboard/diario/${iso}`}
              className={[
                "flex items-center justify-center w-6 h-6 rounded text-[10px] font-medium transition-all hover:scale-110",
                hasEntry ? notaCalColor(nota) : "text-[#555] hover:bg-[#222]",
                isToday && !hasEntry ? "ring-2 ring-[#8E0E1A] ring-offset-1 ring-offset-[#141414]" : "",
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

  const { setmana: currentWeek, frase: fraseSetmana } = getFraseSetmana();
  const calData = await getDiarioCalendar(year);
  const entriesMap = new Map(calData.map(e => [e.fecha, e.nota_dia]));

  const totalEntries = calData.length;
  const notedEntries = calData.filter(e => e.nota_dia);
  const avgNota = notedEntries.length > 0
    ? notedEntries.reduce((a, e) => a + (e.nota_dia ?? 0), 0) / notedEntries.length
    : 0;

  // Streak: consecutive days with entries up to today
  let streak = 0;
  const d = new Date(today);
  while (true) {
    if (entriesMap.has(isoDate(d))) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }

  // Current week
  const weekDays = getWeekDays(today);
  const weekEntries = weekDays.map(day => ({
    day,
    iso: isoDate(day),
    nota: entriesMap.get(isoDate(day)) ?? null,
    hasEntry: entriesMap.has(isoDate(day)),
    isToday: isoDate(day) === todayIso,
    isFuture: isoDate(day) > todayIso,
  }));
  const weekDone = weekEntries.filter(e => e.hasEntry).length;
  const weekNoted = weekEntries.filter(e => e.nota);
  const weekAvg = weekNoted.length > 0
    ? weekNoted.reduce((a, e) => a + (e.nota ?? 0), 0) / weekNoted.length
    : null;

  // Week range label
  const wStart = weekDays[0];
  const wEnd = weekDays[6];
  const sameMonth = wStart.getMonth() === wEnd.getMonth();
  const weekRangeLabel = sameMonth
    ? `${wStart.getDate()}–${wEnd.getDate()} de ${MONTHS_CA[wEnd.getMonth()]}`
    : `${wStart.getDate()} ${MONTHS_CA[wStart.getMonth()]} – ${wEnd.getDate()} ${MONTHS_CA[wEnd.getMonth()]}`;

  return (
    <div className="min-h-screen bg-[#0C0C0C]">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0C0C0C] via-[#1a0306] to-[#0C0C0C] px-5 pt-6 pb-8">
        {/* Background accent */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(142,14,26,0.15),_transparent_60%)] pointer-events-none" />

        <div className="relative max-w-2xl mx-auto">
          {/* Title */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-[10px] font-bold text-[#8E0E1A] uppercase tracking-[0.25em] mb-1">Alt Rendiment</p>
              <h1 className="text-[28px] font-black text-white leading-tight tracking-tight">
                Diari
              </h1>
              <p className="text-[12px] text-[#444] mt-0.5">Privat · visible només per tu</p>
            </div>
            <Link
              href={`/dashboard/diario/${todayIso}`}
              className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-[#8E0E1A] text-white rounded-xl text-[13px] font-bold hover:bg-[#a5101f] transition-colors shadow-lg shadow-[#8E0E1A]/30"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M7 1v6M7 7l3-3M7 7L4 4" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="1" y="8" width="12" height="5" rx="1.5"/>
              </svg>
              Avui
            </Link>
          </div>

          {/* Frase */}
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-5">
            <p className="text-[10px] font-bold text-[#8E0E1A] uppercase tracking-[0.2em] mb-1">Setmana {currentWeek}</p>
            <p className="text-[13px] text-[#CCC] italic leading-relaxed">&ldquo;{fraseSetmana}&rdquo;</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-center">
              <p className="text-[22px] font-black text-white leading-none">{totalEntries}</p>
              <p className="text-[10px] text-[#555] mt-1 uppercase tracking-wider">Entrades</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-center">
              <p className="text-[22px] font-black text-white leading-none">
                {avgNota > 0 ? avgNota.toFixed(1) : "–"}
              </p>
              <p className="text-[10px] text-[#555] mt-1 uppercase tracking-wider">Nota</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-center">
              <p className="text-[22px] font-black text-white leading-none">{streak}</p>
              <p className="text-[10px] text-[#555] mt-1 uppercase tracking-wider">Ratxa 🔥</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-6 py-5">

        {/* ── Planificació (TOP) ── */}
        <div>
          <p className="text-[10px] font-bold text-[#444] uppercase tracking-[0.2em] mb-3">Planificació d&apos;Alt Rendiment</p>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/dashboard/diario/planificacio"
              className="relative overflow-hidden bg-gradient-to-br from-[#8E0E1A] to-[#5a0911] rounded-xl p-4 hover:from-[#a5101f] hover:to-[#6a0b15] transition-all group"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -translate-y-6 translate-x-6" />
              <p className="text-[10px] font-bold text-red-200/70 uppercase tracking-wider mb-1.5">2026</p>
              <p className="text-[15px] font-black text-white leading-tight">Planificació</p>
              <p className="text-[11px] text-red-200/60 mt-0.5">Missió · Prioritats · Objectius</p>
            </Link>

            <Link
              href={`/dashboard/diario/setmana/${year}/${currentWeek}`}
              className="relative overflow-hidden bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 hover:bg-[#222] hover:border-[#333] transition-all group"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/3 rounded-full -translate-y-6 translate-x-6" />
              <p className="text-[10px] font-bold text-[#555] uppercase tracking-wider mb-1.5">Setmana {currentWeek}</p>
              <p className="text-[15px] font-black text-white leading-tight">Revisió</p>
              <p className="text-[11px] text-[#555] mt-0.5">Anàlisi setmanal</p>
            </Link>
          </div>
        </div>

        {/* ── Setmana en curs ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-[#444] uppercase tracking-[0.2em]">Setmana en curs</p>
            <p className="text-[11px] text-[#444]">{weekRangeLabel}</p>
          </div>

          <div className="bg-[#141414] border border-[#1E1E1E] rounded-xl p-4 space-y-4">
            {/* 7 day cells */}
            <div className="grid grid-cols-7 gap-1.5">
              {weekEntries.map(({ day, iso, nota, hasEntry, isToday, isFuture }, idx) => (
                <Link
                  key={iso}
                  href={`/dashboard/diario/${iso}`}
                  className={[
                    "flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all",
                    isToday
                      ? "bg-[#8E0E1A] ring-2 ring-[#8E0E1A] ring-offset-2 ring-offset-[#141414]"
                      : hasEntry
                        ? `bg-gradient-to-b ${notaGradient(nota)}`
                        : isFuture
                          ? "bg-[#0E0E0E] border border-[#1A1A1A] opacity-40"
                          : "bg-[#1A1A1A] border border-[#222] hover:border-[#8E0E1A]/30",
                  ].join(" ")}
                >
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${isToday || hasEntry ? "text-white/70" : "text-[#444]"}`}>
                    {DAYS_CA[idx]}
                  </span>
                  <span className={`text-[14px] font-black leading-none ${isToday || hasEntry ? "text-white" : "text-[#333]"}`}>
                    {day.getDate()}
                  </span>
                  {hasEntry && nota && (
                    <span className="text-[9px] font-bold text-white/60">★{nota}</span>
                  )}
                  {isToday && !hasEntry && (
                    <span className="text-[9px] font-bold text-red-200/60">+</span>
                  )}
                </Link>
              ))}
            </div>

            {/* Week summary */}
            <div className="flex items-center gap-4 pt-1 border-t border-[#1E1E1E]">
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {weekEntries.map((e, i) => (
                    <div
                      key={i}
                      className={`w-4 h-1.5 rounded-full ${e.hasEntry ? notaBg(e.nota, true) : "bg-[#222]"}`}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-[#555]">{weekDone}/7 dies</span>
              </div>
              {weekAvg && (
                <span className="text-[11px] text-[#555] ml-auto">
                  Mitjana ★ {weekAvg.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Calendari complet (collapsible) ── */}
        <details className="group">
          <summary className="flex items-center justify-between cursor-pointer list-none select-none py-3 border-t border-[#1E1E1E]">
            <span className="text-[10px] font-bold text-[#444] uppercase tracking-[0.2em]">
              Calendari {year}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-[#444]">{totalEntries} entrades</span>
              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/diario?year=${year - 1}`}
                  onClick={e => e.stopPropagation()}
                  className="p-1 rounded text-[#444] hover:text-white hover:bg-[#222] transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 2L4 6l4 4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
                <span className="text-[11px] font-bold text-[#555]">{year}</span>
                <Link
                  href={`/dashboard/diario?year=${year + 1}`}
                  onClick={e => e.stopPropagation()}
                  className="p-1 rounded text-[#444] hover:text-white hover:bg-[#222] transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              </div>
              <svg className="text-[#444] group-open:rotate-180 transition-transform" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </summary>

          <div className="pt-4 space-y-4">
            {/* Legend */}
            <div className="flex items-center gap-3 text-[10px] text-[#444]">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block"/>1–2</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block"/>3</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block"/>4–5</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Array.from({ length: 12 }, (_, m) => (
                <MonthGrid key={m} year={year} month={m} entries={entriesMap} today={today} />
              ))}
            </div>
          </div>
        </details>

      </div>
    </div>
  );
}
