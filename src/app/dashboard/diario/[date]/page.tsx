import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { getDiarioEntry } from "@/app/actions/diario";
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
  const prevDate = addDays(date, -1);
  const nextDate = addDays(date, 1);
  const todayIso = new Date().toISOString().slice(0, 10);

  const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("ca-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">

      {/* Navigation header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/diario"
          className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
          title="Tornar al calendari"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M9 2L4 7l5 5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>

        <Link href={`/dashboard/diario/${prevDate}`}
          className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
          title="Dia anterior"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M9 2L4 7l5 5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>

        <h1 className="flex-1 text-sm font-bold text-[#0A0A0A] capitalize text-center">{dateLabel}</h1>

        <Link href={`/dashboard/diario/${nextDate}`}
          className={[
            "p-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition-colors",
            nextDate > todayIso ? "opacity-30 pointer-events-none" : "",
          ].join(" ")}
          title="Dia següent"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M5 2l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </div>

      {entry === null && (
        <div className="bg-[#FEF9F9] border border-[#FECDD3] rounded-xl px-4 py-3 text-sm text-[#8E0E1A]">
          Entrada nova · omple els camps i guarda
        </div>
      )}

      <DiarioForm fecha={date} initial={entry} />
    </div>
  );
}
