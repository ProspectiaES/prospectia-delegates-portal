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
      <div
        className="px-8 md:px-14 pt-10 pb-8"
        style={{
          backgroundColor: "#050505",
          backgroundImage: "radial-gradient(ellipse at 80% 10%, rgba(107,15,26,0.07) 0%, transparent 50%)",
          borderBottom: "1px solid #0E0E0E",
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-5">
            <Link href="/dashboard/diario"
              className="text-[9px] font-bold uppercase tracking-[0.35em] transition-colors"
              style={{ color: "#252220" }}>
              ← Diari
            </Link>
            <span style={{ color: "#151515" }}>·</span>
            <Link href={`/dashboard/diario/${prevDate}`}
              className="text-[9px] font-bold uppercase tracking-[0.35em] transition-colors"
              style={{ color: "#252220" }}>
              ← Anterior
            </Link>
          </div>
          <Link
            href={`/dashboard/diario/${nextDate}`}
            className={[
              "text-[9px] font-bold uppercase tracking-[0.35em] transition-colors",
              nextDate > todayIso ? "pointer-events-none opacity-20" : "",
            ].join(" ")}
            style={{ color: "#252220" }}
          >
            Següent →
          </Link>
        </div>

        <div>
          {isToday && (
            <p className="text-[9px] font-bold uppercase tracking-[0.4em] mb-2"
              style={{ color: "#7D1120" }}>
              Avui
            </p>
          )}
          <h1
            className="font-black capitalize leading-tight"
            style={{ fontSize: "clamp(22px, 3vw, 32px)", color: "#EDE8DF" }}
          >
            {dateLabel}
          </h1>
        </div>

        {entry === null && (
          <p className="text-[10px] font-medium mt-3 uppercase tracking-[0.25em]"
            style={{ color: "#2A2520" }}>
            Entrada nova — omple i guarda
          </p>
        )}
      </div>

      <div
        className="px-8 md:px-14 py-10 space-y-3"
        style={{ backgroundColor: "#050505" }}
      >
        <DiarioForm fecha={date} initial={entry} fraseSetmana={fraseSetmana} />
      </div>
    </div>
  );
}
