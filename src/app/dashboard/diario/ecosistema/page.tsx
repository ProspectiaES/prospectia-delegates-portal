import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { getEcosistemaStats } from "@/app/actions/ecosistema";
import { EcosistemaClient } from "./EcosistemaClient";

const BG      = "#FAFAF8";
const CARD    = "#FFFFFF";
const BORDER  = "#E4DDD5";
const BORDER2 = "#D0C8C0";
const TEXT    = "#1C1510";
const DIM     = "#7A6E67";
const LABEL   = "#9A8E82";
const R       = "#7D1120";
const GOLD    = "#A87830";
const BLUE    = "#2A6A8A";
const SLATE   = "#5A5A6A";
const COPPER  = "#8B5A28";
const GREEN   = "#2A7A4A";

export default async function EcosistemaPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const { persones, stats } = await getEcosistemaStats();

  const avgDesgast = stats?.avg_desgast;
  const avgEstab   = stats?.avg_estabilitat;
  const avgEner    = stats?.avg_energia;
  const drenantPct = stats?.total ? Math.round((stats.drenant / stats.total) * 100) : 0;

  const signals: Array<{ label: string; value: string | null; color: string; sub: string }> = [
    {
      label: "Energia relacional",
      value: avgEner ? `${avgEner.toFixed(1)}/5` : null,
      color: avgEner && avgEner >= 3.5 ? GREEN : avgEner && avgEner >= 2.5 ? GOLD : R,
      sub: "promig del sistema",
    },
    {
      label: "Estabilitat",
      value: avgEstab != null ? `${avgEstab.toFixed(1)}/10` : null,
      color: avgEstab != null && avgEstab >= 7 ? GREEN : avgEstab != null && avgEstab >= 4 ? GOLD : R,
      sub: "KPI promig",
    },
    {
      label: "Desgast energètic",
      value: avgDesgast != null ? `${avgDesgast.toFixed(1)}/10` : null,
      color: avgDesgast != null && avgDesgast >= 7 ? R : avgDesgast != null && avgDesgast >= 4 ? GOLD : GREEN,
      sub: "càrrega del sistema",
    },
    {
      label: "Zona drenant",
      value: stats?.drenant != null ? `${drenantPct}%` : null,
      color: drenantPct >= 40 ? R : drenantPct >= 25 ? GOLD : GREEN,
      sub: `${stats?.drenant ?? 0} persones`,
    },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG, color: TEXT }}>
      <div className="max-w-4xl mx-auto px-5 md:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <Link href="/dashboard/diario"
                className="text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-70"
                style={{ color: LABEL }}>
                ← Diari
              </Link>
            </div>
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] mb-1" style={{ color: R }}>
              Intel·ligència Relacional
            </p>
            <h1 className="text-[28px] font-black leading-tight tracking-tight" style={{ color: TEXT }}>
              Ecosistema Humà
            </h1>
            <p className="text-[11px] mt-1.5 max-w-md leading-relaxed" style={{ color: DIM }}>
              Les persones no són neutres. Cada relació amplifica, sosté, dispersa o erosiona el sistema vital.
            </p>
          </div>
          <Link href="/dashboard/diario/ecosistema/nova"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold shrink-0 transition-all hover:opacity-80"
            style={{ backgroundColor: R, color: "#FFF" }}>
            + Persona
          </Link>
        </div>

        {/* Intelligence signals */}
        {stats && stats.total > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {signals.map(s => (
              <div key={s.label} className="rounded-xl p-4"
                style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: LABEL }}>
                  {s.label}
                </p>
                <p className="text-[24px] font-black tabular-nums leading-none"
                  style={{ color: s.value ? s.color : DIM }}>
                  {s.value ?? "–"}
                </p>
                <p className="text-[9px] mt-1" style={{ color: DIM }}>{s.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Composition bar */}
        {stats && stats.total > 0 && (
          <div className="rounded-xl p-4" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: LABEL }}>
                Composició · {stats.total} persones
              </p>
            </div>
            <div className="grid grid-cols-5 gap-2 mb-3">
              {([
                { cat: "familia",    label: "Família",    color: COPPER,  val: stats.familia },
                { cat: "nucli",      label: "Nucli",      color: R,       val: stats.nucli },
                { cat: "estrategic", label: "Estratègic", color: GOLD,    val: stats.estrategic },
                { cat: "expansio",   label: "Expansió",   color: BLUE,    val: stats.expansio },
                { cat: "drenant",    label: "Drenant",    color: SLATE,   val: stats.drenant },
              ]).map(item => (
                <div key={item.cat} className="rounded-lg p-2.5 text-center"
                  style={{ backgroundColor: `${item.color}10`, border: `1px solid ${item.color}25` }}>
                  <p className="text-[20px] font-black tabular-nums leading-none" style={{ color: item.color }}>
                    {item.val}
                  </p>
                  <p className="text-[8px] font-semibold uppercase tracking-[0.1em] mt-0.5" style={{ color: item.color }}>
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
            <div className="h-1.5 rounded-full overflow-hidden flex gap-0.5"
              style={{ backgroundColor: BORDER }}>
              {stats.familia > 0 && <div style={{ flex: stats.familia, backgroundColor: COPPER }} />}
              {stats.nucli > 0 && <div style={{ flex: stats.nucli, backgroundColor: R }} />}
              {stats.estrategic > 0 && <div style={{ flex: stats.estrategic, backgroundColor: GOLD }} />}
              {stats.expansio > 0 && <div style={{ flex: stats.expansio, backgroundColor: BLUE }} />}
              {stats.drenant > 0 && <div style={{ flex: stats.drenant, backgroundColor: SLATE }} />}
            </div>
          </div>
        )}

        {/* Main intelligence dashboard */}
        <EcosistemaClient persones={persones} stats={stats} />

        {/* Footer note */}
        <div className="flex items-center justify-center py-4">
          <p className="text-[9px] uppercase tracking-widest" style={{ color: BORDER2 }}>
            Sistema d&apos;Intel·ligència Relacional · Diari d&apos;Alt Rendiment
          </p>
        </div>

      </div>
    </div>
  );
}
