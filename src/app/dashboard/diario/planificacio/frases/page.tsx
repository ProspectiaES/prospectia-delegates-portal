import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { FRASES_52, getFraseSetmana } from "@/lib/diario-constants";
import { PlanHeader } from "../_PlanHeader";

export default async function FrasesPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const { setmana: currentWeek } = getFraseSetmana();

  return (
    <div>
      <PlanHeader emoji="💬" title="52 Frases de l'Any" subtitle={`Una frase per cada setmana · Setmana actual: ${currentWeek}`} />
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-2">
        {FRASES_52.map((frase, i) => {
          const week = i + 1;
          const isCurrent = week === currentWeek;
          return (
            <div
              key={week}
              className={[
                "rounded-xl border p-3 flex items-start gap-3",
                isCurrent
                  ? "bg-[#8E0E1A]/10 border-[#8E0E1A]/40 border-l-4 border-l-[#8E0E1A]"
                  : "bg-[#141414] border-[#1E1E1E]",
              ].join(" ")}
            >
              <div className={[
                "w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0",
                isCurrent ? "bg-[#8E0E1A] text-white" : "bg-[#1E1E1E] text-[#555]",
              ].join(" ")}>
                {week}
              </div>
              <p className={[
                "text-[13px] leading-snug",
                isCurrent ? "text-white font-semibold" : "text-[#666]",
              ].join(" ")}>
                {frase}
                {isCurrent && (
                  <span className="ml-2 text-[10px] font-bold text-[#8E0E1A] uppercase tracking-wider">Ara</span>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
