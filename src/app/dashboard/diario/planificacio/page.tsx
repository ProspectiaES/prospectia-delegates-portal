import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { getFraseSetmana } from "@/lib/diario-constants";

const SECTIONS = [
  {
    href: "/dashboard/diario/planificacio/carta",
    emoji: "✉️",
    title: "Carta al jo 2026",
    desc: "Ponts entre el passat i el futur",
  },
  {
    href: "/dashboard/diario/planificacio/missio",
    emoji: "🧭",
    title: "Missió Personal",
    desc: "El teu propòsit vital i professional",
  },
  {
    href: "/dashboard/diario/planificacio/prioritats",
    emoji: "🎯",
    title: "Prioritats 2026",
    desc: "Top 5, valors i allò a eliminar",
  },
  {
    href: "/dashboard/diario/planificacio/objectius",
    emoji: "📈",
    title: "Objectius Vitals",
    desc: "Horitzons 2026, 2030, 2035, 2040",
  },
  {
    href: "/dashboard/diario/planificacio/influencies",
    emoji: "👥",
    title: "Influències",
    desc: "Referents, inspiradors i cercle proper",
  },
  {
    href: "/dashboard/diario/planificacio/desitjos",
    emoji: "✨",
    title: "Desitjos",
    desc: "El que vols crear i viure",
  },
  {
    href: "/dashboard/diario/planificacio/frases",
    emoji: "💬",
    title: "52 Frases",
    desc: "La frase de cada setmana de l'any",
  },
];

export default async function PlanificacioPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const { setmana, frase } = getFraseSetmana();
  const now = new Date();
  const currentYear = now.getFullYear();

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">

      {/* Back */}
      <Link
        href="/dashboard/diario"
        className="inline-flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#0A0A0A] transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M9 2L4 7l5 5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Tornar al diari
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#0A0A0A] tracking-tight">Planificació d&apos;Alt Rendiment</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">Estratègia, missió i objectius · {currentYear}</p>
      </div>

      {/* Current week phrase */}
      <div className="bg-white rounded-xl border-l-4 border-l-[#8E0E1A] border border-[#E5E7EB] px-4 py-3">
        <p className="text-[11px] font-semibold text-[#8E0E1A] uppercase tracking-wider mb-1">Frase · setmana {setmana}</p>
        <p className="text-sm text-[#0A0A0A] italic">&ldquo;{frase}&rdquo;</p>
      </div>

      {/* Planning sections grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SECTIONS.map(s => (
          <Link
            key={s.href}
            href={s.href}
            className="bg-white rounded-xl border border-[#E5E7EB] p-4 hover:border-[#8E0E1A]/30 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#FEF2F2] flex items-center justify-center text-base shrink-0 group-hover:bg-[#FECDD3]/40 transition-colors">
                {s.emoji}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#0A0A0A] leading-tight">{s.title}</p>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">{s.desc}</p>
              </div>
            </div>
          </Link>
        ))}

        {/* Weekly review — special card */}
        <Link
          href={`/dashboard/diario/setmana/${currentYear}/${setmana}`}
          className="bg-[#8E0E1A] rounded-xl border border-[#8E0E1A] p-4 hover:bg-[#7a0b16] transition-colors group"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-base shrink-0">
              📅
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-tight">Revisió Setmanal</p>
              <p className="text-[11px] text-white/70 mt-0.5">Setmana {setmana} · {currentYear}</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
