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

function notaColor(nota: number | null): string {
  if (!nota) return "bg-[#F3F4F6] text-[#9CA3AF]";
  if (nota >= 5) return "bg-emerald-500 text-white";
  if (nota >= 4) return "bg-emerald-400 text-white";
  if (nota >= 3) return "bg-amber-400 text-white";
  if (nota >= 2) return "bg-orange-400 text-white";
  return "bg-red-400 text-white";
}

function MonthGrid({
  year, month, entries,
}: {
  year: number;
  month: number;
  entries: Map<string, number | null>;
}) {
  const today = new Date();
  const firstDay = new Date(year, month, 1);
  // Monday=0 offset
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
      <h3 className="text-[11px] font-bold text-[#374151] uppercase tracking-wider mb-3">
        {MONTHS_CA[month]}
      </h3>
      <div className="grid grid-cols-7 gap-px mb-1">
        {DAYS_CA.map(d => (
          <div key={d} className="text-[9px] font-semibold text-[#9CA3AF] text-center pb-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const isoDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
          const nota = entries.get(isoDate) ?? null;
          const hasEntry = entries.has(isoDate);

          return (
            <Link
              key={isoDate}
              href={`/dashboard/diario/${isoDate}`}
              className={[
                "flex items-center justify-center w-7 h-7 rounded-md text-[11px] font-medium transition-all hover:scale-110",
                hasEntry ? notaColor(nota) : "text-[#374151] hover:bg-[#F3F4F6]",
                isToday && !hasEntry ? "ring-2 ring-[#8E0E1A] ring-offset-1" : "",
              ].join(" ")}
              title={hasEntry ? `Nota: ${nota ?? "–"}` : "Sense entrada"}
            >
              {day}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default async function DiarioPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const sp = await searchParams;
  const year = parseInt(sp.year ?? "") || new Date().getFullYear();
  const todayIso = new Date().toISOString().slice(0, 10);

  const { setmana: currentWeek } = getFraseSetmana();
  const calData = await getDiarioCalendar(year);
  const entriesMap = new Map(calData.map(e => [e.fecha, e.nota_dia]));

  const totalEntries = calData.length;
  const avgNota = calData.filter(e => e.nota_dia).reduce((acc, e) => acc + (e.nota_dia ?? 0), 0) /
    (calData.filter(e => e.nota_dia).length || 1);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0A0A0A] tracking-tight">Diari d&apos;Alt Rendiment</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Privat · visible només per tu</p>
        </div>
        <Link
          href={`/dashboard/diario/${todayIso}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#8E0E1A] text-white rounded-lg text-sm font-semibold hover:bg-[#7a0b16] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 1v6M7 7l3-3M7 7L4 4" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="1" y="8" width="12" height="5" rx="1.5"/>
          </svg>
          Entrada d&apos;avui
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-3 text-center">
          <p className="text-2xl font-bold text-[#0A0A0A]">{totalEntries}</p>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">Entrades {year}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-3 text-center">
          <p className="text-2xl font-bold text-[#0A0A0A]">{totalEntries > 0 ? avgNota.toFixed(1) : "–"}</p>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">Nota mitjana</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-3 text-center">
          <p className="text-2xl font-bold text-[#0A0A0A]">
            {Math.round((totalEntries / (new Date().getMonth() === 0 && new Date().getFullYear() === year ? 1 : new Date().getFullYear() === year ? new Date().getMonth() + 1 : 12)) * 10) / 10}
          </p>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">Entrades/mes</p>
        </div>
      </div>

      {/* Year nav */}
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/diario?year=${year - 1}`}
          className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M9 2L4 7l5 5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
        <span className="text-base font-bold text-[#0A0A0A]">{year}</span>
        <Link href={`/dashboard/diario?year=${year + 1}`}
          className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M5 2l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>

        {/* Legend */}
        <div className="flex items-center gap-2 ml-auto text-[10px] text-[#9CA3AF]">
          <span className="w-3 h-3 rounded-sm bg-red-400 inline-block"/>1–2
          <span className="w-3 h-3 rounded-sm bg-amber-400 inline-block"/>3
          <span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block"/>4–5
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: 12 }, (_, m) => (
          <MonthGrid key={m} year={year} month={m} entries={entriesMap} />
        ))}
      </div>

      {/* Planificació 2026 */}
      <div>
        <h2 className="text-sm font-bold text-[#0A0A0A] mb-3">Planificació d&apos;Alt Rendiment</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/dashboard/diario/planificacio"
            className="bg-white rounded-xl border border-[#E5E7EB] p-4 hover:border-[#8E0E1A]/30 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#FEF2F2] flex items-center justify-center text-base shrink-0">
                🗂️
              </div>
              <div>
                <p className="text-sm font-bold text-[#0A0A0A]">Planificació</p>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">Missió, prioritats, objectius</p>
              </div>
            </div>
          </Link>

          <Link
            href={`/dashboard/diario/setmana/${year}/${currentWeek}`}
            className="bg-white rounded-xl border border-[#E5E7EB] p-4 hover:border-[#8E0E1A]/30 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#FEF2F2] flex items-center justify-center text-base shrink-0">
                📅
              </div>
              <div>
                <p className="text-sm font-bold text-[#0A0A0A]">Setmana actual</p>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">Revisió setmana {currentWeek}</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
