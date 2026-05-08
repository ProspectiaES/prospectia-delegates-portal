import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { getDiarioEntry } from "@/app/actions/diario";
import { getFraseSetmana } from "@/lib/diario-constants";
import { DiarioForm } from "./DiarioForm";

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default async function DiarioDatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const { date } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const entry = await getDiarioEntry(date);
  const { frase: fraseSetmana } = getFraseSetmana(new Date(date + "T12:00:00"));
  const prevDate = addDays(date, -1);
  const nextDate = addDays(date, 1);
  const todayIso = new Date().toISOString().slice(0, 10);

  const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("ca-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const isToday = date === todayIso;

  return (
    <div className="max-w-2xl mx-auto">

      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0C0C0C] via-[#1a0306] to-[#0C0C0C] px-5 pt-5 pb-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(142,14,26,0.12),_transparent_60%)] pointer-events-none" />

        <div className="relative flex items-center gap-3 mb-4">
          <Link
            href="/dashboard/diario"
            className="p-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 2L4 7l5 5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>

          <Link
            href={`/dashboard/diario/${prevDate}`}
            className="p-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 2L4 7l5 5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>

          <div className="flex-1 text-center">
            {isToday && (
              <p className="text-[10px] font-bold text-[#8E0E1A] uppercase tracking-[0.2em] mb-0.5">Avui</p>
            )}
            <h1 className="text-[13px] font-bold text-white capitalize">{dateLabel}</h1>
          </div>

          <Link
            href={`/dashboard/diario/${nextDate}`}
            className={[
              "p-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors",
              nextDate > todayIso ? "opacity-20 pointer-events-none" : "",
            ].join(" ")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 2l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>

        {entry === null && (
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
            <p className="text-[12px] text-red-300/80">Entrada nova · omple els camps i guarda</p>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <DiarioForm fecha={date} initial={entry} fraseSetmana={fraseSetmana} />
      </div>
    </div>
  );
}
