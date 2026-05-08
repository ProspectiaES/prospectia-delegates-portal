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
    accent: "from-violet-600 to-violet-900",
  },
  {
    href: "/dashboard/diario/planificacio/missio",
    emoji: "🧭",
    title: "Missió Personal",
    desc: "El teu propòsit vital i professional",
    accent: "from-blue-600 to-blue-900",
  },
  {
    href: "/dashboard/diario/planificacio/prioritats",
    emoji: "🎯",
    title: "Prioritats 2026",
    desc: "Top 5, valors i allò a eliminar",
    accent: "from-[#8E0E1A] to-[#4a0810]",
  },
  {
    href: "/dashboard/diario/planificacio/objectius",
    emoji: "📈",
    title: "Objectius Vitals",
    desc: "Horitzons 2026, 2030, 2035, 2040",
    accent: "from-emerald-600 to-emerald-900",
  },
  {
    href: "/dashboard/diario/planificacio/influencies",
    emoji: "👥",
    title: "Influències",
    desc: "Referents, inspiradors i cercle proper",
    accent: "from-amber-600 to-amber-900",
  },
  {
    href: "/dashboard/diario/planificacio/desitjos",
    emoji: "✨",
    title: "Desitjos",
    desc: "El que vols crear i viure",
    accent: "from-pink-600 to-pink-900",
  },
  {
    href: "/dashboard/diario/planificacio/frases",
    emoji: "💬",
    title: "52 Frases",
    desc: "La frase de cada setmana de l'any",
    accent: "from-cyan-600 to-cyan-900",
  },
];

export default async function PlanificacioPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const { setmana, frase } = getFraseSetmana();
  const now = new Date();
  const currentYear = now.getFullYear();

  return (
    <div className="min-h-screen bg-[#0C0C0C]">

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0C0C0C] via-[#1a0306] to-[#0C0C0C] px-5 pt-6 pb-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(142,14,26,0.12),_transparent_60%)] pointer-events-none" />

        <div className="relative max-w-3xl mx-auto">
          <Link
            href="/dashboard/diario"
            className="inline-flex items-center gap-2 text-[11px] text-[#555] hover:text-white transition-colors mb-4"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 2L4 6l4 4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Diari
          </Link>

          <p className="text-[10px] font-bold text-[#8E0E1A] uppercase tracking-[0.25em] mb-1">Alt Rendiment</p>
          <h1 className="text-[26px] font-black text-white leading-tight tracking-tight mb-4">
            Planificació
          </h1>

          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
            <p className="text-[10px] font-bold text-[#8E0E1A] uppercase tracking-[0.2em] mb-1">Frase · setmana {setmana}</p>
            <p className="text-[13px] text-[#CCC] italic leading-relaxed">&ldquo;{frase}&rdquo;</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">

        {/* Planning sections */}
        <div className="grid grid-cols-2 gap-2">
          {SECTIONS.map(s => (
            <Link
              key={s.href}
              href={s.href}
              className={`relative overflow-hidden bg-gradient-to-br ${s.accent} rounded-xl p-4 hover:brightness-110 transition-all group`}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
              <div className="relative">
                <p className="text-2xl mb-2">{s.emoji}</p>
                <p className="text-[14px] font-black text-white leading-tight">{s.title}</p>
                <p className="text-[11px] text-white/50 mt-0.5">{s.desc}</p>
              </div>
            </Link>
          ))}

          {/* Weekly review */}
          <Link
            href={`/dashboard/diario/setmana/${currentYear}/${setmana}`}
            className="relative overflow-hidden col-span-2 bg-gradient-to-r from-[#0A0A0A] to-[#1a0306] border border-[#8E0E1A]/30 rounded-xl p-4 hover:border-[#8E0E1A]/60 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#8E0E1A]/20 flex items-center justify-center text-xl shrink-0">
                📅
              </div>
              <div>
                <p className="text-[14px] font-black text-white">Revisió Setmanal</p>
                <p className="text-[11px] text-[#555]">Setmana {setmana} · {currentYear}</p>
              </div>
              <svg className="ml-auto text-[#444]" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </Link>
        </div>

      </div>
    </div>
  );
}
