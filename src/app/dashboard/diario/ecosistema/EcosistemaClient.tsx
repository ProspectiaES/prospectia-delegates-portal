"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { OrbitalMap } from "./OrbitalMap";
import { deletePersona } from "@/app/actions/ecosistema";
import type { Persona, Categoria } from "@/app/actions/ecosistema";

// ─── Design tokens (warm light) ──────────────────────────────────────────────
const BG      = "#FAFAF8";
const CARD    = "#FFFFFF";
const SURFACE = "#FBF8F5";
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

const CAT_COLOR: Record<string, string> = {
  familia:    COPPER,
  nucli:      R,
  estrategic: GOLD,
  expansio:   BLUE,
  drenant:    SLATE,
};

const CAT_LABEL: Record<string, string> = {
  familia:    "Família",
  nucli:      "Nucli",
  estrategic: "Estratègic",
  expansio:   "Expansió",
  drenant:    "Drenant",
};

const CAT_DESC: Record<string, string> = {
  familia:    "Vincles familiars",
  nucli:      "Persones àncora",
  estrategic: "Anell estratègic",
  expansio:   "Creixement",
  drenant:    "Alta càrrega",
};

const ALL_CATS: Categoria[] = ["familia", "nucli", "estrategic", "expansio", "drenant"];

interface Stats {
  total: number;
  familia: number;
  nucli: number;
  estrategic: number;
  expansio: number;
  drenant: number;
  avg_energia: number | null;
  avg_claredat: number | null;
  avg_confianca: number | null;
  avg_alineacio: number | null;
  avg_desgast: number | null;
  avg_estabilitat: number | null;
}

interface Props {
  persones: Persona[];
  stats: Stats | null;
}

// ─── Risk badge ───────────────────────────────────────────────────────────────
function RiskBadge({ p }: { p: Persona }) {
  const risk = p.risc_emocional ?? p.risc_professional ?? null;
  const desgast = p.desgast_energetic ?? null;
  const maxRisk = Math.max(risk ?? 0, desgast ?? 0);

  if (maxRisk === 0) return null;

  const color = maxRisk >= 7 ? "#C4280A" : maxRisk >= 4 ? GOLD : "#3A8A4A";
  const label = maxRisk >= 7 ? "risc alt" : maxRisk >= 4 ? "atenció" : "estable";

  return (
    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
      style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}>
      {label}
    </span>
  );
}

// ─── Score mini-bars ──────────────────────────────────────────────────────────
function MiniScore({ label, value, max = 5, color }: { label: string; value: number | null; max?: number; color?: string }) {
  const pct = value != null ? (value / max) * 100 : 0;
  const c = color ?? R;
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: LABEL }}>{label}</span>
        <span className="text-[9px] font-bold tabular-nums" style={{ color: value ? TEXT : DIM }}>
          {value != null ? `${value}` : "–"}
        </span>
      </div>
      <div className="h-0.5 rounded-full overflow-hidden" style={{ backgroundColor: BORDER2 }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: c }} />
      </div>
    </div>
  );
}

// ─── Person card ──────────────────────────────────────────────────────────────
function PersonCard({ p, isSelected, onSelect }: { p: Persona; isSelected: boolean; onSelect: () => void }) {
  const [, startTransition] = useTransition();
  const catColor = CAT_COLOR[p.categoria] ?? R;
  const hasTrets = p.perfil_conductual.length > 0;

  return (
    <div
      className="rounded-xl p-4 cursor-pointer transition-all"
      style={{
        border: `1px solid ${isSelected ? catColor : BORDER}`,
        backgroundColor: isSelected ? `${catColor}10` : CARD,
      }}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
          style={{ backgroundColor: `${catColor}15`, border: `1px solid ${catColor}30` }}>
          {p.avatar_emoji ?? "👤"}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[13px] font-bold truncate" style={{ color: TEXT }}>{p.nom}</p>
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0"
              style={{ backgroundColor: `${catColor}20`, color: catColor }}>
              {CAT_LABEL[p.categoria]}
            </span>
            <RiskBadge p={p} />
          </div>
          {p.rol_vital && (
            <p className="text-[10px] truncate mt-0.5" style={{ color: DIM }}>{p.rol_vital}</p>
          )}
          {hasTrets && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {p.perfil_conductual.slice(0, 3).map(t => (
                <span key={t} className="text-[8px] px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: SURFACE, color: LABEL, border: `1px solid ${BORDER}` }}>
                  {t}
                </span>
              ))}
              {p.perfil_conductual.length > 3 && (
                <span className="text-[8px]" style={{ color: DIM }}>+{p.perfil_conductual.length - 3}</span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 shrink-0">
          <Link href={`/dashboard/diario/ecosistema/${p.id}`}
            className="w-6 h-6 rounded flex items-center justify-center text-[11px] transition-colors hover:opacity-70"
            style={{ color: DIM }}
            onClick={e => e.stopPropagation()}>
            ✎
          </Link>
          <button
            className="w-6 h-6 rounded flex items-center justify-center text-[13px] transition-colors hover:opacity-70"
            style={{ color: DIM }}
            onClick={e => {
              e.stopPropagation();
              if (!confirm(`Eliminar ${p.nom} del sistema?`)) return;
              startTransition(async () => { await deletePersona(p.id); });
            }}>
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Selected side panel ──────────────────────────────────────────────────────
function SelectedPanel({ p }: { p: Persona }) {
  const catColor = CAT_COLOR[p.categoria] ?? R;
  const hasKpis = [p.risc_emocional, p.estabilitat_kpi, p.reciprocitat, p.desgast_energetic].some(v => v != null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0"
          style={{ backgroundColor: `${catColor}18`, border: `1px solid ${catColor}30` }}>
          {p.avatar_emoji ?? "👤"}
        </div>
        <div>
          <p className="text-[14px] font-bold" style={{ color: TEXT }}>{p.nom}</p>
          {p.rol_vital && <p className="text-[10px]" style={{ color: DIM }}>{p.rol_vital}</p>}
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: `${catColor}20`, color: catColor }}>
            {CAT_DESC[p.categoria]}
          </span>
        </div>
      </div>

      {/* Perfil conductual */}
      {p.perfil_conductual.length > 0 && (
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: LABEL }}>
            Perfil conductual
          </p>
          <div className="flex flex-wrap gap-1">
            {p.perfil_conductual.map(t => {
              const int = p.intensitat_perfil?.[t] ?? 1;
              return (
                <span key={t} className="text-[9px] px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: int === 2 ? `${catColor}25` : SURFACE,
                    color: int === 2 ? catColor : LABEL,
                    border: `1px solid ${int === 2 ? catColor + "40" : BORDER}`,
                    fontWeight: int === 2 ? 700 : 400,
                  }}>
                  {t}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Sensació */}
      {p.sensacio_post && (
        <div className="rounded-lg p-2.5" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: LABEL }}>
            Sensació post-interacció
          </p>
          <p className="text-[11px] italic" style={{ color: DIM }}>&ldquo;{p.sensacio_post}&rdquo;</p>
        </div>
      )}

      {/* Dimensions percebudes */}
      <div className="space-y-2">
        <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: LABEL }}>Dimensions</p>
        <MiniScore label="Energia" value={p.energia} color={catColor} />
        <MiniScore label="Claredat" value={p.claredat} color={catColor} />
        <MiniScore label="Confiança" value={p.confianca} color={catColor} />
        <MiniScore label="Alineació" value={p.alineacio} color={catColor} />
      </div>

      {/* KPIs de risc */}
      {hasKpis && (
        <div className="space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: LABEL }}>Intel·ligència relacional</p>
          {p.risc_emocional != null && <MiniScore label="Risc emocional" value={p.risc_emocional} max={10} color={p.risc_emocional >= 7 ? "#C4280A" : GOLD} />}
          {p.estabilitat_kpi != null && <MiniScore label="Estabilitat" value={p.estabilitat_kpi} max={10} color="#3A8A4A" />}
          {p.reciprocitat != null && <MiniScore label="Reciprocitat" value={p.reciprocitat} max={10} color={BLUE} />}
          {p.desgast_energetic != null && <MiniScore label="Desgast energètic" value={p.desgast_energetic} max={10} color={p.desgast_energetic >= 7 ? "#C4280A" : GOLD} />}
        </div>
      )}

      {/* AI impact */}
      {p.impacte_ia && (
        <div className="rounded-lg p-2.5" style={{ backgroundColor: `${R}08`, border: `1px solid ${R}25` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: R }}>
            Impacte IA
          </p>
          <p className="text-[10px] leading-relaxed" style={{ color: DIM }}>{p.impacte_ia}</p>
        </div>
      )}

      <Link href={`/dashboard/diario/ecosistema/${p.id}`}
        className="block text-center py-2 rounded-lg text-[11px] font-bold transition-all hover:opacity-80"
        style={{ backgroundColor: R, color: "#FFF" }}>
        Obrir perfil complet
      </Link>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function EcosistemaClient({ persones, stats }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Categoria | "mapa">("mapa");
  const selected = persones.find(p => p.id === selectedId) ?? null;

  const tabs: Array<[Categoria | "mapa", string]> = [
    ["mapa", "Mapa Orbital"],
    ["familia", `Família ${stats?.familia ? `(${stats.familia})` : ""}`],
    ["nucli", `Nucli ${stats?.nucli ? `(${stats.nucli})` : ""}`],
    ["estrategic", `Estratègic ${stats?.estrategic ? `(${stats.estrategic})` : ""}`],
    ["expansio", `Expansió ${stats?.expansio ? `(${stats.expansio})` : ""}`],
    ["drenant", `Drenant ${stats?.drenant ? `(${stats.drenant})` : ""}`],
  ];

  const catPersones = activeTab !== "mapa" ? persones.filter(p => p.categoria === activeTab) : [];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, backgroundColor: BG }}>

      {/* Intelligence strip */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-px"
          style={{ backgroundColor: BORDER, borderBottom: `1px solid ${BORDER}` }}>
          {([
            { l: "Família",   v: stats.familia,       c: COPPER },
            { l: "Nucli",     v: stats.nucli,         c: R },
            { l: "Estratègic",v: stats.estrategic,    c: GOLD },
            { l: "Expansió",  v: stats.expansio,      c: BLUE },
            { l: "Drenant",   v: stats.drenant,       c: SLATE },
            { l: "Sistema",   v: stats.total,         c: TEXT },
          ]).map(item => (
            <div key={item.l} className="flex flex-col items-center justify-center py-3 px-2"
              style={{ backgroundColor: CARD }}>
              <span className="text-[18px] font-black tabular-nums leading-none" style={{ color: item.c }}>
                {item.v}
              </span>
              <span className="text-[8px] font-semibold uppercase tracking-[0.12em] mt-0.5" style={{ color: DIM }}>
                {item.l}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar px-4 pt-4 gap-1"
        style={{ borderBottom: `1px solid ${BORDER}` }}>
        {tabs.map(([tab, label]) => {
          const catColor = tab !== "mapa" ? (CAT_COLOR[tab] ?? R) : R;
          const isActive = activeTab === tab;
          return (
            <button key={tab}
              onClick={() => setActiveTab(tab)}
              className="shrink-0 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] transition-all rounded-t-lg"
              style={{
                color: isActive ? catColor : DIM,
                borderBottom: isActive ? `2px solid ${catColor}` : "2px solid transparent",
                backgroundColor: isActive ? `${catColor}08` : "transparent",
              }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Mapa Orbital */}
      {activeTab === "mapa" && (
        persones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-4"
              style={{ backgroundColor: `${R}12`, border: `1px solid ${R}25` }}>
              🌐
            </div>
            <p className="text-[14px] font-bold mb-1.5" style={{ color: TEXT }}>Sistema buit</p>
            <p className="text-[12px] mb-6 max-w-xs" style={{ color: DIM }}>
              Comença cartografiant les persones que formen el teu ecosistema vital.
            </p>
            <Link href="/dashboard/diario/ecosistema/nova"
              className="px-5 py-2.5 rounded-xl text-[12px] font-bold transition-all hover:opacity-80"
              style={{ backgroundColor: R, color: "#FFF" }}>
              + Afegir primera persona
            </Link>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row">
            <div className="flex-1 flex items-center justify-center p-4" style={{ minHeight: "400px" }}>
              <OrbitalMap
                persones={persones}
                onSelect={id => setSelectedId(id === selectedId ? null : id)}
                selectedId={selectedId}
              />
            </div>

            <div className="md:w-72 p-5 overflow-y-auto"
              style={{ borderLeft: `1px solid ${BORDER}`, maxHeight: "620px" }}>
              {selected ? (
                <SelectedPanel p={selected} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                    style={{ backgroundColor: SURFACE }}>
                    <span style={{ color: DIM }}>◎</span>
                  </div>
                  <p className="text-[11px]" style={{ color: DIM }}>
                    Selecciona una persona<br />per veure el seu perfil relacional
                  </p>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* Category views */}
      {activeTab !== "mapa" && (
        <div className="p-4">
          {catPersones.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ border: `1px dashed ${BORDER2}` }}>
              <p className="text-[12px] mb-3" style={{ color: DIM }}>
                Cap persona a {CAT_LABEL[activeTab].toLowerCase()} encara.
              </p>
              <Link href={`/dashboard/diario/ecosistema/nova?cat=${activeTab}`}
                className="text-[12px] font-semibold hover:underline" style={{ color: R }}>
                + Afegir persona
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {catPersones.map(p => (
                <PersonCard key={p.id} p={p}
                  isSelected={selectedId === p.id}
                  onSelect={() => setSelectedId(p.id === selectedId ? null : p.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-5 py-3"
        style={{ borderTop: `1px solid ${BORDER}` }}>
        <p className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: DIM }}>
          Intel·ligència Relacional
        </p>
        <Link href="/dashboard/diario/ecosistema/nova"
          className="text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
          style={{ backgroundColor: `${R}18`, color: R, border: `1px solid ${R}30` }}>
          + Nova persona
        </Link>
      </div>

    </div>
  );
}
