import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { FRASES_52, getFraseSetmana } from "@/lib/diario-constants";

export default async function FrasesPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const { setmana: currentWeek } = getFraseSetmana();

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <Link
        href="/dashboard/diario/planificacio"
        className="inline-flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#0A0A0A] transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M9 2L4 7l5 5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Planificació
      </Link>

      <div>
        <h1 className="text-xl font-bold text-[#0A0A0A] tracking-tight">52 Frases del Any</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">Una frase per cada setmana · Setmana actual: {currentWeek}</p>
      </div>

      <div className="space-y-2">
        {FRASES_52.map((frase, i) => {
          const week = i + 1;
          const isCurrent = week === currentWeek;
          return (
            <div
              key={week}
              className={[
                "bg-white rounded-xl border p-3 flex items-start gap-3",
                isCurrent
                  ? "border-[#8E0E1A] border-l-4 shadow-sm"
                  : "border-[#E5E7EB]",
              ].join(" ")}
            >
              <div className={[
                "w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0",
                isCurrent ? "bg-[#8E0E1A] text-white" : "bg-[#F3F4F6] text-[#9CA3AF]",
              ].join(" ")}>
                {week}
              </div>
              <p className={[
                "text-sm leading-snug",
                isCurrent ? "text-[#0A0A0A] font-semibold" : "text-[#374151]",
              ].join(" ")}>
                {frase}
                {isCurrent && (
                  <span className="ml-2 text-[10px] font-bold text-[#8E0E1A] uppercase tracking-wider">Aquesta setmana</span>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
