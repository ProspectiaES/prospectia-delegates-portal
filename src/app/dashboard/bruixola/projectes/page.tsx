import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { getProjectes } from "@/app/actions/bruixola";
import type { Projecte } from "@/app/actions/bruixola";

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
  actiu: BLUE, completat: GREEN, congelat: LABEL, cancelat: RED, pendent: DIM,
};
const ESTAT_LABEL: Record<string, string> = {
  actiu: "Actiu", completat: "Completat", congelat: "Congelat", cancelat: "Cancel·lat", pendent: "Pendent",
};

function ProjecteCard({ p }: { p: Projecte }) {
  const c = ESTAT_COLOR[p.estat] ?? DIM;
  const pct = p.progress ?? 0;
  const impacteScore = p.impacte ?? 0;
  const esforçScore = p.esforc ?? 0;

  return (
    <Link href={`/dashboard/bruixola/projectes/${p.id}`}
      className="block rounded-xl p-4 transition-all hover:border-[#2A3045]"
      style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-start gap-3">
        {/* Priority bar */}
        <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
          {p.prioritat != null && (
            <div className="w-1 rounded-full" style={{
              height: `${(p.prioritat / 5) * 28}px`,
              backgroundColor: p.prioritat >= 4 ? RED : p.prioritat === 3 ? AMBER : LABEL,
            }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <p className="text-[13px] font-semibold flex-1 min-w-0" style={{ color: TEXT }}>{p.nom}</p>
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0"
              style={{ backgroundColor: `${c}18`, color: c, border: `1px solid ${c}30` }}>
              {ESTAT_LABEL[p.estat]}
            </span>
          </div>

          {p.descripcio && (
            <p className="text-[10px] mt-1 line-clamp-1" style={{ color: DIM }}>{p.descripcio}</p>
          )}

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-[9px] font-semibold" style={{ color: LABEL }}>{p.tipus}</span>
            {p.impacte != null && (
              <span className="text-[9px]" style={{ color: DIM }}>
                Impacte <span className="font-bold" style={{ color: impacteScore >= 4 ? GREEN : DIM }}>{p.impacte}/5</span>
              </span>
            )}
            {p.esforc != null && (
              <span className="text-[9px]" style={{ color: DIM }}>
                Esforç <span className="font-bold" style={{ color: esforçScore >= 4 ? AMBER : DIM }}>{p.esforc}/5</span>
              </span>
            )}
            {p.data_objectiu && (
              <span className="text-[9px]" style={{ color: LABEL }}>
                {new Date(p.data_objectiu).toLocaleDateString("ca-ES", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            )}
          </div>

          <div className="mt-2.5 h-0.5 rounded-full overflow-hidden" style={{ backgroundColor: BORDER2 }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c }} />
          </div>
        </div>

        <span className="text-[11px] font-bold tabular-nums shrink-0 mt-0.5" style={{ color: pct >= 80 ? GREEN : DIM }}>
          {pct}%
        </span>
      </div>

      {p.seguent_accio && (
        <div className="mt-3 pt-3 flex items-start gap-2" style={{ borderTop: `1px solid ${BORDER}` }}>
          <span className="text-[9px] shrink-0 mt-0.5" style={{ color: GOLD }}>→</span>
          <p className="text-[10px]" style={{ color: DIM }}>{p.seguent_accio}</p>
        </div>
      )}
    </Link>
  );
}

function MatriuCell({ label, color, items }: { label: string; color: string; items: Projecte[] }) {
  return (
    <div className="rounded-xl p-3 flex-1 min-h-[80px]"
      style={{ backgroundColor: `${color}08`, border: `1px solid ${color}20` }}>
      <p className="text-[8px] font-bold uppercase tracking-wider mb-2" style={{ color }}>{label}</p>
      {items.length === 0 ? (
        <p className="text-[9px]" style={{ color: LABEL }}>Cap</p>
      ) : (
        <div className="space-y-1">
          {items.map(p => (
            <Link key={p.id} href={`/dashboard/bruixola/projectes/${p.id}`}
              className="block text-[10px] hover:opacity-70 transition-opacity line-clamp-1"
              style={{ color: TEXT }}>
              {p.nom}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function ProjectesPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const projectes = await getProjectes();
  const actius = projectes.filter(p => p.estat !== "cancelat" && p.estat !== "completat");

  // Impact/Effort matrix quadrants (only for projects with both values)
  const ambMatriu = actius.filter(p => p.impacte != null && p.esforc != null);
  const quickWins    = ambMatriu.filter(p => (p.impacte ?? 0) >= 3 && (p.esforc ?? 0) <= 2);
  const estrategics  = ambMatriu.filter(p => (p.impacte ?? 0) >= 3 && (p.esforc ?? 0) >= 3);
  const omplir       = ambMatriu.filter(p => (p.impacte ?? 0) <= 2 && (p.esforc ?? 0) <= 2);
  const revaluar     = ambMatriu.filter(p => (p.impacte ?? 0) <= 2 && (p.esforc ?? 0) >= 3);

  const stats = {
    total: projectes.length,
    actius: projectes.filter(p => p.estat === "actiu").length,
    completats: projectes.filter(p => p.estat === "completat").length,
    congelats: projectes.filter(p => p.estat === "congelat").length,
  };

  const byEstat: Record<string, Projecte[]> = {
    actiu:     projectes.filter(p => p.estat === "actiu"),
    pendent:   projectes.filter(p => p.estat === "pendent"),
    congelat:  projectes.filter(p => p.estat === "congelat"),
    completat: projectes.filter(p => p.estat === "completat"),
    cancelat:  projectes.filter(p => p.estat === "cancelat"),
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
          <h1 className="text-[26px] font-black leading-tight tracking-tight" style={{ color: TEXT }}>Projectes</h1>
          <p className="text-[11px] mt-1" style={{ color: DIM }}>
            {stats.total} projectes · {stats.actius} actius · {stats.congelats} congelats · {stats.completats} completats
          </p>
        </div>
        <Link href="/dashboard/bruixola/projectes/nou"
          className="px-4 py-2.5 rounded-xl text-[11px] font-bold shrink-0 transition-all hover:opacity-80"
          style={{ backgroundColor: GOLD, color: "#FFFFFF" }}>
          + Nou projecte
        </Link>
      </div>

      {/* Stats strip */}
      {projectes.length > 0 && (
        <div className="grid grid-cols-4 gap-px overflow-hidden rounded-xl" style={{ backgroundColor: BORDER }}>
          {[
            { label: "Actius",     value: stats.actius,     color: BLUE },
            { label: "Completats", value: stats.completats, color: GREEN },
            { label: "Congelats",  value: stats.congelats,  color: LABEL },
            { label: "Total",      value: stats.total,      color: DIM },
          ].map(s => (
            <div key={s.label} className="py-4 text-center" style={{ backgroundColor: CARD }}>
              <p className="text-[22px] font-black tabular-nums" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[8px] font-bold uppercase tracking-widest mt-1" style={{ color: LABEL }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {projectes.length === 0 && (
        <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: CARD, border: `1px dashed ${BORDER2}` }}>
          <p className="text-[13px] font-bold mb-2" style={{ color: TEXT }}>Cap projecte definit</p>
          <p className="text-[11px] mb-6" style={{ color: DIM }}>
            Defineix els projectes estratègics de l&apos;empresa.
          </p>
          <Link href="/dashboard/bruixola/projectes/nou"
            className="inline-block px-5 py-2.5 rounded-xl text-[11px] font-bold transition-all hover:opacity-80"
            style={{ backgroundColor: GOLD, color: "#FFFFFF" }}>
            + Crear primer projecte
          </Link>
        </div>
      )}

      {/* Matriu Impacte/Esforç */}
      {ambMatriu.length >= 2 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: GOLD }} />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: GOLD }}>
              Matriu Impacte / Esforç
            </p>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, backgroundColor: CARD }}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[8px] uppercase tracking-wider" style={{ color: LABEL }}>Alt Impacte</p>
              </div>
              <div className="flex gap-2 mb-2">
                <MatriuCell label="Quick Wins ✓" color={GREEN} items={quickWins} />
                <MatriuCell label="Estratègics" color={BLUE} items={estrategics} />
              </div>
              <div className="flex gap-2">
                <MatriuCell label="Omplir temps" color={LABEL} items={omplir} />
                <MatriuCell label="Revaluar" color={RED} items={revaluar} />
              </div>
              <div className="flex justify-between mt-2">
                <p className="text-[8px] uppercase tracking-wider" style={{ color: LABEL }}>Baix Esforç</p>
                <p className="text-[8px] uppercase tracking-wider" style={{ color: LABEL }}>Alt Esforç</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Llista per estat */}
      {(["actiu", "pendent", "congelat", "completat", "cancelat"] as const).map(estat => {
        const items = byEstat[estat];
        if (!items || items.length === 0) return null;
        const color = ESTAT_COLOR[estat] ?? DIM;
        const label = ESTAT_LABEL[estat];
        return (
          <div key={estat}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: color }} />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color }}>
                {label} ({items.length})
              </p>
            </div>
            <div className="space-y-2">
              {items.map(p => <ProjecteCard key={p.id} p={p} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
