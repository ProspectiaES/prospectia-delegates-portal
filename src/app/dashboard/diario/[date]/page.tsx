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

const C = {
  text:    "#1C1510",
  label:   "#9A8E82",
  border:  "#E4DDD5",
  accent:  "#7D1120",
  card:    "#FFFFFF",
};

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
    <div className="max-w-2xl mx-auto px-6 md:px-10">

      {/* Header */}
      <div className="py-8 space-y-4">
        {/* Nav */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/diario"
              className="text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors hover:underline"
              style={{ color: C.label }}>
              ← Diari
            </Link>
            <span style={{ color: C.border }}>·</span>
            <Link href={`/dashboard/diario/${prevDate}`}
              className="text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors hover:underline"
              style={{ color: C.label }}>
              ← Anterior
            </Link>
          </div>
          <Link
            href={`/dashboard/diario/${nextDate}`}
            className={[
              "text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors hover:underline",
              nextDate > todayIso ? "pointer-events-none opacity-30" : "",
            ].join(" ")}
            style={{ color: C.label }}
          >
            Següent →
          </Link>
        </div>

        {/* Date */}
        <div>
          {isToday && (
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1"
              style={{ color: C.accent }}>
              Avui
            </p>
          )}
          <h1
            className="font-bold capitalize leading-tight"
            style={{ fontSize: "clamp(18px, 2.5vw, 26px)", color: C.text }}
          >
            {dateLabel}
          </h1>
          {entry === null && (
            <p className="text-[10px] font-medium mt-1.5 uppercase tracking-[0.18em]"
              style={{ color: C.label }}>
              Entrada nova — omple i guarda
            </p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", backgroundColor: C.border }} />

      {/* Form */}
      <div className="py-8">
        <DiarioForm fecha={date} initial={entry} fraseSetmana={fraseSetmana} />
      </div>

    </div>
  );
}
