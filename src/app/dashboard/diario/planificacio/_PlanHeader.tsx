import Link from "next/link";

export function PlanHeader({ title, subtitle, emoji }: {
  title: string;
  subtitle: string;
  emoji: string;
}) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#0C0C0C] via-[#1a0306] to-[#0C0C0C] px-5 pt-5 pb-7">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(142,14,26,0.12),_transparent_60%)] pointer-events-none" />
      <div className="relative">
        <Link
          href="/dashboard/diario/planificacio"
          className="inline-flex items-center gap-2 text-[11px] text-[#555] hover:text-white transition-colors mb-4"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 2L4 6l4 4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Planificació
        </Link>
        <div className="flex items-end gap-3">
          <span className="text-3xl">{emoji}</span>
          <div>
            <p className="text-[10px] font-bold text-[#8E0E1A] uppercase tracking-[0.25em] mb-0.5">2026</p>
            <h1 className="text-[22px] font-black text-white leading-tight">{title}</h1>
            <p className="text-[12px] text-[#555] mt-0.5">{subtitle}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
