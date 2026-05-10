import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { getBruixolaDashboard } from "@/app/actions/bruixola";
import type { Objectiu, Projecte, KPI, Bloquejo } from "@/app/actions/bruixola";

// ─── Design tokens ────────────────────────────────────────────────────────────
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
  actiu:     BLUE,
  assolit:   GREEN,
  bloquejat: RED,
  desviat:   AMBER,
  cancelat:  LABEL,
  pendent:   DIM,
};

const ESTAT_LABEL: Record<string, string> = {
  actiu:     "Actiu",
  assolit:   "Assolit",
  bloquejat: "Bloquejat",
  desviat:   "Desviat",
  cancelat:  "Cancel·lat",
  pendent:   "Pendent",
};

function PriorityDot({ v }: { v: number | null }) {
  if (!v) return null;
  const c = v >= 4 ? RED : v === 3 ? AMBER : LABEL;
  return <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ backgroundColor: c }} />;
}

function ObjectiuCard({ o }: { o: Objectiu }) {
  const c = ESTAT_COLOR[o.estat] ?? DIM;
  const pct = o.progress ?? 0;
  const hasMetric = o.metrica && o.valor_objectiu != null;
  return (
    <Link href={`/dashboard/bruixola/objectius/${o.id}`}
      className="block rounded-xl p-4 transition-all hover:border-[#2A3045]"
      style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-start gap-2.5 mb-3">
        <PriorityDot v={o.prioritat} />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold leading-snug" style={{ color: TEXT }}>{o.titol}</p>
          {hasMetric && (
            <p className="text-[10px] mt-0.5" style={{ color: DIM }}>
              {o.valor_actual ?? "–"} / {o.valor_objectiu} {o.metrica}
            </p>
          )}
        </div>
        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0"
          style={{ backgroundColor: `${c}18`, color: c, border: `1px solid ${c}30` }}>
          {ESTAT_LABEL[o.estat]}
        </span>
      </div>
      <div className="h-0.5 rounded-full overflow-hidden" style={{ backgroundColor: BORDER2 }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: c }} />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[9px]" style={{ color: LABEL }}>
          {o.tipus === "anual" ? `Anual ${o.any ?? ""}` : o.tipus === "trimestral" ? `Q${o.trimestre ?? "?"} ${o.any ?? ""}` : `Mensual`}
        </span>
        <span className="text-[9px] font-bold tabular-nums" style={{ color: DIM }}>{pct}%</span>
      </div>
    </Link>
  );
}

function ProjecteCard({ p }: { p: Projecte }) {
  const c = p.estat === "congelat" ? LABEL : p.estat === "completat" ? GREEN : BLUE;
  return (
    <Link href={`/dashboard/bruixola/projectes/${p.id}`}
      className="block rounded-xl p-4 transition-all hover:border-[#2A3045]"
      style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-start gap-2.5 mb-2">
        <PriorityDot v={p.prioritat} />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold" style={{ color: TEXT }}>{p.nom}</p>
          {p.seguent_accio && (
            <p className="text-[10px] mt-0.5 truncate" style={{ color: DIM }}>→ {p.seguent_accio}</p>
          )}
        </div>
        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0"
          style={{ backgroundColor: `${c}18`, color: c, border: `1px solid ${c}30` }}>
          {p.estat}
        </span>
      </div>
      <div className="flex gap-3">
        {p.impacte != null && (
          <span className="text-[9px]" style={{ color: LABEL }}>
            Impacte <span style={{ color: p.impacte >= 4 ? GOLD : DIM }}>{p.impacte}/5</span>
          </span>
        )}
        {p.data_objectiu && (
          <span className="text-[9px]" style={{ color: LABEL }}>
            {new Date(p.data_objectiu).toLocaleDateString("ca-ES", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        )}
      </div>
    </Link>
  );
}

function KPIRow({ k }: { k: KPI }) {
  const pct = k.valor_objectiu && k.valor_objectiu > 0
    ? Math.min(100, Math.round((( k.valor_actual ?? 0) / k.valor_objectiu) * 100))
    : null;
  const desv = k.valor_actual != null && k.valor_objectiu != null && k.valor_objectiu > 0
    ? Math.round(((k.valor_actual - k.valor_objectiu) / k.valor_objectiu) * 100)
    : null;
  const color = desv == null ? DIM : desv >= 0 ? GREEN : Math.abs(desv) > 20 ? RED : AMBER;
  return (
    <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold" style={{ color: TEXT }}>{k.nom}</p>
        <p className="text-[9px] mt-0.5" style={{ color: LABEL }}>{k.categoria ?? "—"}</p>
      </div>
      <div className="text-right">
        <p className="text-[12px] font-bold tabular-nums" style={{ color: TEXT }}>
          {k.valor_actual ?? "–"}{k.unitat ? ` ${k.unitat}` : ""}
        </p>
        {desv != null && (
          <p className="text-[9px] font-semibold" style={{ color }}>
            {desv >= 0 ? "+" : ""}{desv}%
          </p>
        )}
      </div>
      {pct != null && (
        <div className="w-14">
          <div className="h-0.5 rounded-full overflow-hidden" style={{ backgroundColor: BORDER2 }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
          </div>
        </div>
      )}
    </div>
  );
}

function BloqueigRow({ b }: { b: Bloquejo }) {
  const c = b.severitat >= 4 ? RED : b.severitat >= 3 ? AMBER : DIM;
  return (
    <div className="flex items-start gap-3 py-2.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: c }} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold" style={{ color: TEXT }}>{b.titol}</p>
        {b.accio_necessaria && (
          <p className="text-[9px] mt-0.5" style={{ color: DIM }}>Acció: {b.accio_necessaria}</p>
        )}
      </div>
      <span className="text-[9px] shrink-0" style={{ color: LABEL }}>{b.tipus ?? "—"}</span>
    </div>
  );
}

export default async function BruixolaPage() {
  const profile = await getProfile();
  if (!profile || (profile.role !== "OWNER" && profile.role !== "CONSIGLIERE")) redirect("/dashboard");

  const { focus, objectius, projectes, kpis, bloquejos, diagnostic, stats } = await getBruixolaDashboard();

  const objectiusCritics = objectius
    .filter(o => o.estat === "actiu" || o.estat === "bloquejat" || o.estat === "desviat")
    .slice(0, 6);
  const projectesPrioritaris = projectes
    .filter(p => p.estat === "actiu" || p.estat === "pendent")
    .slice(0, 6);
  const kpisVisibles = kpis.slice(0, 8);
  const bloquejosPendents = bloquejos.filter(b => !b.resolt).slice(0, 5);

  const signals = [
    { label: "Objectius actius",    value: stats.objectius_actius,    color: BLUE, href: "/dashboard/bruixola/objectius" },
    { label: "Projectes actius",    value: stats.projectes_actius,     color: GOLD, href: "/dashboard/bruixola/projectes" },
    { label: "KPIs desviats",       value: stats.kpis_desviats,        color: stats.kpis_desviats > 0 ? AMBER : GREEN, href: "/dashboard/bruixola/kpis" },
    { label: "Bloquejos oberts",    value: bloquejosPendents.length,   color: bloquejosPendents.length > 0 ? RED : GREEN, href: "/dashboard/bruixola" },
  ];

  const isEmpty = objectius.length === 0 && projectes.length === 0;

  return (
    <div className="max-w-6xl mx-auto px-5 md:px-10 py-10 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.35em] mb-2" style={{ color: LABEL }}>
            Sistema de Govern Empresarial
          </p>
          <h1 className="text-[32px] font-black leading-none tracking-tight" style={{ color: TEXT }}>
            Brúixola Estratègica
          </h1>
          {focus ? (
            <p className="text-[13px] mt-2 max-w-xl leading-relaxed" style={{ color: DIM }}>
              {focus.declaracio}
              {focus.periode && <span className="ml-2 text-[10px] font-bold uppercase tracking-wide" style={{ color: LABEL }}>· {focus.periode}</span>}
            </p>
          ) : (
            <p className="text-[12px] mt-2" style={{ color: LABEL }}>
              Cap focus definit. <Link href="/dashboard/bruixola/anamnesi" className="hover:underline" style={{ color: GOLD }}>Iniciar anamnesi →</Link>
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/dashboard/bruixola/focus"
            className="px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all hover:opacity-80"
            style={{ backgroundColor: SURFACE, color: LABEL, border: `1px solid ${BORDER}` }}>
            {focus ? "Editar focus" : "Definir focus"}
          </Link>
          <Link href="/dashboard/bruixola/anamnesi"
            className="px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all hover:opacity-80"
            style={{ backgroundColor: SURFACE, color: GOLD, border: `1px solid ${GOLD}30` }}>
            Anamnesi IA
          </Link>
          <Link href="/dashboard/bruixola/objectius/nou"
            className="px-4 py-2 rounded-lg text-[11px] font-bold transition-all hover:opacity-80"
            style={{ backgroundColor: GOLD, color: "#FFFFFF" }}>
            + Objectiu
          </Link>
        </div>
      </div>

      {/* Signal strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {signals.map(s => (
          <Link key={s.label} href={s.href}
            className="rounded-xl p-4 transition-all hover:border-[#2A3045]"
            style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <p className="text-[28px] font-black tabular-nums leading-none" style={{ color: s.color }}>
              {s.value}
            </p>
            <p className="text-[9px] font-semibold uppercase tracking-widest mt-1.5" style={{ color: LABEL }}>
              {s.label}
            </p>
          </Link>
        ))}
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: CARD, border: `1px dashed ${BORDER2}` }}>
          <p className="text-[13px] font-bold mb-2" style={{ color: TEXT }}>Sistema sense dades</p>
          <p className="text-[11px] mb-6 max-w-sm mx-auto" style={{ color: DIM }}>
            Comença amb l&apos;anamnesi estratègica per construir el mapa empresarial i generar el primer diagnòstic.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard/bruixola/anamnesi"
              className="px-5 py-2.5 rounded-xl text-[11px] font-bold transition-all hover:opacity-80"
              style={{ backgroundColor: GOLD, color: "#FFFFFF" }}>
              Iniciar Anamnesi IA
            </Link>
            <Link href="/dashboard/bruixola/objectius/nou"
              className="px-5 py-2.5 rounded-xl text-[11px] font-bold transition-all hover:opacity-80"
              style={{ backgroundColor: SURFACE, color: TEXT, border: `1px solid ${BORDER2}` }}>
              + Afegir objectiu
            </Link>
          </div>
        </div>
      )}

      {/* Main grid */}
      {!isEmpty && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Objectius */}
          {objectiusCritics.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, backgroundColor: CARD }}>
              <div className="px-5 py-3.5 flex items-center justify-between"
                style={{ backgroundColor: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: BLUE }} />
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: BLUE }}>Objectius</p>
                </div>
                <Link href="/dashboard/bruixola/objectius"
                  className="text-[9px] font-bold uppercase tracking-widest hover:opacity-70" style={{ color: LABEL }}>
                  Veure tots →
                </Link>
              </div>
              <div className="p-4 space-y-2">
                {objectiusCritics.map(o => <ObjectiuCard key={o.id} o={o} />)}
              </div>
            </div>
          )}

          {/* Projectes */}
          {projectesPrioritaris.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, backgroundColor: CARD }}>
              <div className="px-5 py-3.5 flex items-center justify-between"
                style={{ backgroundColor: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: GOLD }} />
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: GOLD }}>Projectes</p>
                </div>
                <Link href="/dashboard/bruixola/projectes"
                  className="text-[9px] font-bold uppercase tracking-widest hover:opacity-70" style={{ color: LABEL }}>
                  Veure tots →
                </Link>
              </div>
              <div className="p-4 space-y-2">
                {projectesPrioritaris.map(p => <ProjecteCard key={p.id} p={p} />)}
              </div>
            </div>
          )}

          {/* KPIs */}
          {kpisVisibles.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, backgroundColor: CARD }}>
              <div className="px-5 py-3.5 flex items-center justify-between"
                style={{ backgroundColor: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: GREEN }} />
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: GREEN }}>KPIs</p>
                </div>
                <Link href="/dashboard/bruixola/kpis"
                  className="text-[9px] font-bold uppercase tracking-widest hover:opacity-70" style={{ color: LABEL }}>
                  Gestionar →
                </Link>
              </div>
              <div className="px-5 py-2">
                {kpisVisibles.map(k => <KPIRow key={k.id} k={k} />)}
              </div>
            </div>
          )}

          {/* Bloquejos + Decisions */}
          <div className="space-y-4">
            {bloquejosPendents.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, backgroundColor: CARD }}>
                <div className="px-5 py-3.5 flex items-center gap-2"
                  style={{ backgroundColor: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
                  <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: RED }} />
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: RED }}>
                    Bloquejos ({bloquejosPendents.length})
                  </p>
                </div>
                <div className="px-5 py-2">
                  {bloquejosPendents.map(b => <BloqueigRow key={b.id} b={b} />)}
                </div>
              </div>
            )}

            {/* Diagnòstic IA resum */}
            {diagnostic && (
              <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${GOLD}30`, backgroundColor: CARD }}>
                <div className="px-5 py-3.5 flex items-center justify-between"
                  style={{ backgroundColor: `${GOLD}08`, borderBottom: `1px solid ${GOLD}20` }}>
                  <div className="flex items-center gap-2">
                    <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: GOLD }} />
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: GOLD }}>
                      Diagnòstic IA
                    </p>
                  </div>
                  <Link href="/dashboard/bruixola/diagnostic"
                    className="text-[9px] font-bold uppercase tracking-widest hover:opacity-70" style={{ color: LABEL }}>
                    Complet →
                  </Link>
                </div>
                <div className="p-5 space-y-3">
                  {diagnostic.estat_global && (
                    <p className="text-[12px] font-bold" style={{ color: TEXT }}>{diagnostic.estat_global}</p>
                  )}
                  {diagnostic.focus_recomanat && (
                    <div className="rounded-lg p-3" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}>
                      <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: LABEL }}>Focus recomanat</p>
                      <p className="text-[11px] leading-relaxed" style={{ color: DIM }}>{diagnostic.focus_recomanat}</p>
                    </div>
                  )}
                  {diagnostic.seguents_accions.length > 0 && (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: LABEL }}>Accions immediates</p>
                      <ul className="space-y-1">
                        {diagnostic.seguents_accions.slice(0, 3).map((a, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-[10px] mt-0.5" style={{ color: GOLD }}>→</span>
                            <p className="text-[10px] leading-relaxed" style={{ color: DIM }}>{a}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CTA diagnòstic si no existeix */}
            {!diagnostic && (objectius.length > 0 || projectes.length > 0) && (
              <div className="rounded-2xl p-5 text-center" style={{ border: `1px dashed ${GOLD}30`, backgroundColor: `${GOLD}05` }}>
                <p className="text-[11px] font-bold mb-1.5" style={{ color: GOLD }}>Diagnòstic IA pendent</p>
                <p className="text-[10px] mb-4" style={{ color: DIM }}>
                  Genera un diagnòstic empresarial complet basat en les dades actuals.
                </p>
                <Link href="/dashboard/bruixola/diagnostic"
                  className="inline-block px-4 py-2 rounded-lg text-[10px] font-bold transition-all hover:opacity-80"
                  style={{ backgroundColor: `${GOLD}20`, color: GOLD, border: `1px solid ${GOLD}40` }}>
                  Generar diagnòstic
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {[
          { href: "/dashboard/bruixola/objectius",  label: "Objectius" },
          { href: "/dashboard/bruixola/projectes",  label: "Projectes" },
          { href: "/dashboard/bruixola/kpis",       label: "KPIs" },
          { href: "/dashboard/bruixola/empreses",   label: "Empreses · Actors" },
          { href: "/dashboard/bruixola/diagnostic", label: "Diagnòstic IA" },
          { href: "/dashboard/bruixola/focus",      label: "Focus" },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className="rounded-xl py-2.5 px-3 text-center text-[10px] font-bold uppercase tracking-wide transition-all hover:border-[#2A3045]"
            style={{ backgroundColor: SURFACE, color: LABEL, border: `1px solid ${BORDER}` }}>
            {item.label}
          </Link>
        ))}
      </div>

    </div>
  );
}
