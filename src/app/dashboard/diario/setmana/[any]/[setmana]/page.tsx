import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { getSetmana } from "@/app/actions/diario-planificacio";
import { FRASES_52 } from "@/lib/diario-constants";
import { SetmanaForm } from "./SetmanaForm";

export default async function SetmanaPage({
  params,
}: {
  params: Promise<{ any: string; setmana: string }>;
}) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const { any: anyStr, setmana: setmanaStr } = await params;
  const any = parseInt(anyStr, 10);
  const setmana = parseInt(setmanaStr, 10);

  if (isNaN(any) || isNaN(setmana) || setmana < 1 || setmana > 53) notFound();

  const data = await getSetmana(any, setmana);
  const fraseIdx = Math.min(setmana - 1, FRASES_52.length - 1);
  const fraseSetmana = FRASES_52[fraseIdx];

  const prevWeek = setmana > 1 ? setmana - 1 : null;
  const nextWeek = setmana < 52 ? setmana + 1 : null;

  return (
    <div className="min-h-screen bg-[#0C0C0C]">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0C0C0C] via-[#1a0306] to-[#0C0C0C] px-5 pt-5 pb-7">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(142,14,26,0.12),_transparent_60%)] pointer-events-none" />
        <div className="relative flex items-center gap-3 mb-4">
          <Link href="/dashboard/diario/planificacio" className="p-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 2L4 7l5 5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          {prevWeek ? (
            <Link href={`/dashboard/diario/setmana/${any}/${prevWeek}`} className="p-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 2L4 7l5 5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          ) : <div className="w-8" />}
          <div className="flex-1 text-center">
            <p className="text-[10px] font-bold text-[#8E0E1A] uppercase tracking-[0.2em]">Revisió</p>
            <h1 className="text-[15px] font-black text-white">Setmana {setmana} · {any}</h1>
          </div>
          {nextWeek ? (
            <Link href={`/dashboard/diario/setmana/${any}/${nextWeek}`} className="p-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M5 2l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          ) : <div className="w-8" />}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        <SetmanaForm any={any} setmana={setmana} fraseSetmana={fraseSetmana} initial={data} />
      </div>
    </div>
  );
}
