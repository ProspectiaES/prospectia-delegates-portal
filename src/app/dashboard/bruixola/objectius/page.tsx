import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { getObjectius } from "@/app/actions/bruixola";
import type { Objectiu } from "@/app/actions/bruixola";

const BG      = "#FFFFFF";
const CARD    = "#FFFFFF";
const SURFACE = "#F9FAFB";
const BORDER  = "#E5E7EB";
const BORDER2 = "#D1D5DB";
const TEXT    = "#111827";
const DIM     = "#6B7280";
const LABEL   = "#9CA3AF";
const GOLD    = "#B45309";
const BLUE    = "#1D4ED8";
const GREEN   = "#15803D";
const RED     = "#DC2626";
const AMBER   = "#D97706";

const ESTAT_COLOR: Record<string, string> = {
  actiu: BLUE, assolit: GREEN, bloquejat: RED, desviat: AMBER, cancelat: LABEL, pendent: DIM,
};
const ESTAT_LABEL: Record<string, string> = {
  actiu: "Actiu", assolit: "Assolit", bloquejat: "Bloquejat", desviat: "Desviat", cancelat: "Cancel·lat", pendent: "Pendent",
};

function ObjectiuRow({ o }: { o: Objectiu }) {
  const c = ESTAT_COLOR[o.estat] ?? DIM;
  const pct = o.progress ?? 0;
  const hasMetric = o.metrica && o.valor_objectiu != null;
  const desviacio = hasMetric && o.valor_actual != null && o.valor_objectiu
    ? Math.round(((o.valor_actual - o.valor_objectiu) / o.valor_objectiu) * 100)
    : null;

  return (
    <Link href={`/dashboard/bruixola/objectius/${o.id}`}
      className="block rounded-xl p-4 transition-all hover:border-[#2A3045]"
      style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-start gap-3">
        {/* Priority indicator */}
        <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
          {o.prioritat != null && (
            <div className="w-1 rounded-full" style={{ height: `${(o.prioritat / 5) * 28}px`, backgroundColor: o.prioritat >= 4 ? RED : o.prioritat === 3 ? AMBER : LABEL }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <p className="text-[13px] font-semibold flex-1 min-w-0" style={{ color: TEXT }}>{o.titol}</p>
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0"
              style={{ backgroundColor: `${c}18`, color: c, border: `1px solid ${c}30` }}>
              {ESTAT_LABEL[o.estat]}
            </span>
          </div>

          {o.descripcio && (
            <p className="text-[10px] mt-1 line-clamp-1" style={{ color: DIM }}>{o.descripcio}</p>
          )}

          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <span className="text-[9px] font-semibold" style={{ color: LABEL }}>
              {o.tipus === "anual" ? `Anual ${o.any ?? ""}` : o.tipus === "trimestral" ? `Q${o.trimestre ?? "?"} ${o.any ?? ""}` : `Mensual`}
            </span>
            {hasMetric && (
              <span className="text-[9px]" style={{ color: DIM }}>
                {o.valor_actual ?? "–"} / {o.valor_objectiu} {o.metrica}
                {desviacio != null && (
                  <span className="ml-1 font-bold" style={{ color: desviacio >= 0 ? GREEN : RED }}>
                    ({desviacio >= 0 ? "+" : ""}{desviacio}%)
                  </span>
                )}
              </span>
            )}
            {o.data_objectiu && (
              <span className="text-[9px]" style={{ color: LABEL }}>
                {new Date(o.data_objectiu).toLocaleDateString("ca-ES", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-2.5 h-0.5 rounded-full overflow-hidden" style={{ backgroundColor: BORDER2 }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c }} />
          </div>
        </div>

        <span className="text-[11px] font-bold tabular-nums shrink-0 mt-0.5" style={{ color: pct >= 80 ? GREEN : DIM }}>
          {pct}%
        </span>
      </div>

      {o.seguent_accio && (
        <div className="mt-3 pt-3 flex items-start gap-2" style={{ borderTop: `1px solid ${BORDER}` }}>
          <span className="text-[9px] shrink-0 mt-0.5" style={{ color: GOLD }}>→</span>
          <p className="text-[10px]" style={{ color: DIM }}>{o.seguent_accio}</p>
        </div>
      )}
    </Link>
  );
}

export default async function ObjectiusPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const objectius = await getObjectius();

  const byTipus = {
    anual:      objectius.filter(o => o.tipus === "anual"),
    trimestral: objectius.filter(o => o.tipus === "trimestral"),
    mensual:    objectius.filter(o => o.tipus === "mensual"),
  };

  const stats = {
    total:      objectius.length,
    actius:     objectius.filter(o => o.estat === "actiu").length,
    assolits:   objectius.filter(o => o.estat === "assolit").length,
    bloquejats: objectius.filter(o => o.estat === "bloquejat").length,
    desviats:   objectius.filter(o => o.estat === "desviat").length,
  };

  return (
    <div className="max-w-4xl mx-auto px-5 md:px-10 py-10 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <Link href="/dashboard/bruixola" className="text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-70" style={{ color: LABEL }}>
              ← Brúixola
            </Link>
          </div>
          <h1 className="text-[26px] font-black leading-tight tracking-tight" style={{ color: TEXT }}>Objectius</h1>
          <p className="text-[11px] mt-1" style={{ color: DIM }}>
            {stats.total} objectius · {stats.actius} actius · {stats.bloquejats} bloquejats · {stats.desviats} desviats
          </p>
        </div>
        <Link href="/dashboard/bruixola/objectius/nou"
          className="px-4 py-2.5 rounded-xl text-[11px] font-bold shrink-0 transition-all hover:opacity-80"
          style={{ backgroundColor: GOLD, color: "#FFFFFF" }}>
          + Nou objectiu
        </Link>
      </div>

      {/* Status summary */}
      {objectius.length > 0 && (
        <div className="grid grid-cols-4 gap-px overflow-hidden rounded-xl" style={{ backgroundColor: BORDER }}>
          {[
            { label: "Actius",     value: stats.actius,     color: BLUE },
            { label: "Assolits",   value: stats.assolits,   color: GREEN },
            { label: "Bloquejats", value: stats.bloquejats, color: RED },
            { label: "Desviats",   value: stats.desviats,   color: AMBER },
          ].map(s => (
            <div key={s.label} className="py-4 text-center" style={{ backgroundColor: CARD }}>
              <p className="text-[22px] font-black tabular-nums" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[8px] font-bold uppercase tracking-widest mt-1" style={{ color: LABEL }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {objectius.length === 0 && (
        <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: CARD, border: `1px dashed ${BORDER2}` }}>
          <p className="text-[13px] font-bold mb-2" style={{ color: TEXT }}>Cap objectiu definit</p>
          <p className="text-[11px] mb-6" style={{ color: DIM }}>
            Comença definint objectius mesurables. La IA t&apos;ajudarà a convertir idees en objectius executables.
          </p>
          <Link href="/dashboard/bruixola/objectius/nou"
            className="inline-block px-5 py-2.5 rounded-xl text-[11px] font-bold transition-all hover:opacity-80"
            style={{ backgroundColor: GOLD, color: "#FFFFFF" }}>
            + Crear primer objectiu
          </Link>
        </div>
      )}

      {/* Objectius per tipus */}
      {(["anual", "trimestral", "mensual"] as const).map(tipus => {
        const items = byTipus[tipus];
        if (items.length === 0) return null;
        const tipusLabel = tipus === "anual" ? "Anuals" : tipus === "trimestral" ? "Trimestrals" : "Mensuals";
        const tipusColor = tipus === "anual" ? GOLD : tipus === "trimestral" ? BLUE : DIM;
        return (
          <div key={tipus}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: tipusColor }} />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: tipusColor }}>
                {tipusLabel} ({items.length})
              </p>
            </div>
            <div className="space-y-2">
              {items.map(o => <ObjectiuRow key={o.id} o={o} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
