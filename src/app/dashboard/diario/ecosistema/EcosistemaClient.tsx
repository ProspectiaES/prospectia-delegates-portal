// @ts-nocheck
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { OrbitalMap } from "./OrbitalMap";
import { deletePersona } from "@/app/actions/ecosistema";
import type { Persona, Categoria } from "@/app/actions/ecosistema";

const R = "#7D1120";
const BK = "#1C1510";
const BORDER = "#E4DDD5";
const LABEL = "#9A8E82";

const CAT_LABEL: Record<Categoria, string> = {
  nucli:      "Nucli central",
  estrategic: "Anell estratègic",
  expansio:   "Expansió",
  drenant:    "Zona drenant",
};

const CAT_COLOR: Record<Categoria, string> = {
  nucli:      "#7D1120",
  estrategic: "#A87830",
  expansio:   "#2A6A8A",
  drenant:    "#5A5A6A",
};

const CAT_BG: Record<Categoria, string> = {
  nucli:      "#FBF0F0",
  estrategic: "#FBF4E8",
  expansio:   "#EEF4F8",
  drenant:    "#F4F4F6",
};

const ESTAT_OPTIONS = [
  "expansiva", "inspiradora", "estable", "en evolució",
  "distant", "tensionada", "reactiva", "drenadora",
];

interface Props {
  persones: Persona[];
  stats: {
    total: number; nucli: number; estrategic: number; expansio: number; drenant: number;
    avg_energia: number | null; avg_claredat: number | null;
    avg_confianca: number | null; avg_alineacio: number | null;
  } | null;
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: LABEL }}>{label}</span>
        <span className="text-[11px] font-bold tabular-nums" style={{ color: value ? BK : LABEL }}>
          {value ? `${value}/5` : "–"}
        </span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: BORDER }}>
        <div className="h-full rounded-full transition-all"
          style={{ width: `${((value ?? 0) / 5) * 100}%`, backgroundColor: R }} />
      </div>
    </div>
  );
}

function PersonCard({ p, onSelect, isSelected }: { p: Persona; onSelect: () => void; isSelected: boolean }) {
  const [, startTransition] = useTransition();

  return (
    <div
      className="rounded-xl p-4 cursor-pointer transition-all"
      style={{
        border: `1.5px solid ${isSelected ? CAT_COLOR[p.categoria] : BORDER}`,
        backgroundColor: isSelected ? CAT_BG[p.categoria] : "#FFF",
      }}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
          style={{ backgroundColor: CAT_BG[p.categoria], border: `1px solid ${CAT_COLOR[p.categoria]}30` }}>
          {p.avatar_emoji ?? "👤"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-bold truncate" style={{ color: BK }}>{p.nom}</p>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
              style={{ backgroundColor: CAT_BG[p.categoria], color: CAT_COLOR[p.categoria] }}>
              {CAT_LABEL[p.categoria].split(" ")[0]}
            </span>
          </div>
          {p.rol_vital && (
            <p className="text-[11px] truncate mt-0.5" style={{ color: LABEL }}>{p.rol_vital}</p>
          )}
          {p.sensacio_post && (
            <p className="text-[11px] mt-1.5 italic" style={{ color: "#5C5048" }}>
              &ldquo;{p.sensacio_post}&rdquo;
            </p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <Link href={`/dashboard/diario/ecosistema/${p.id}`}
            className="w-6 h-6 rounded flex items-center justify-center text-[11px] transition-colors hover:bg-gray-100"
            style={{ color: LABEL }}
            onClick={e => e.stopPropagation()}>
            ✎
          </Link>
          <button
            className="w-6 h-6 rounded flex items-center justify-center text-[11px] transition-colors hover:bg-red-50"
            style={{ color: LABEL }}
            onClick={e => {
              e.stopPropagation();
              if (!confirm(`Eliminar ${p.nom}?`)) return;
              startTransition(async () => { await deletePersona(p.id); });
            }}>
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

export function EcosistemaClient({ persones, stats }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Categoria | "mapa">("mapa");

  const selected = persones.find(p => p.id === selectedId);
  const categories: Categoria[] = ["nucli", "estrategic", "expansio", "drenant"];

  return (
    <div className="space-y-6">

      {/* Stats strip */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Energia relacional", val: stats.avg_energia },
            { label: "Claredat aportada",  val: stats.avg_claredat },
            { label: "Confiança",          val: stats.avg_confianca },
            { label: "Alineació vital",    val: stats.avg_alineacio },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4"
              style={{ backgroundColor: "#FFF", border: `1px solid ${BORDER}` }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1" style={{ color: LABEL }}>
                {s.label}
              </p>
              <p className="text-[26px] font-black tabular-nums" style={{ color: s.val ? BK : BORDER }}>
                {s.val?.toFixed(1) ?? "–"}
              </p>
              <p className="text-[10px]" style={{ color: LABEL }}>de 5</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: "#F0EAE0" }}>
        {([["mapa", "Mapa Orbital"], ...categories.map(c => [c, CAT_LABEL[c as Categoria]])] as [string, string][]).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab as typeof activeTab)}
            className="flex-1 py-2 px-2 rounded-lg text-[11px] font-semibold transition-all"
            style={{
              backgroundColor: activeTab === tab ? "#FFF" : "transparent",
              color: activeTab === tab ? BK : LABEL,
              boxShadow: activeTab === tab ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Mapa orbital */}
      {activeTab === "mapa" && (
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, backgroundColor: "#FAFAF8" }}>
          {persones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <p className="text-[28px] mb-3">🌐</p>
              <p className="text-[14px] font-semibold mb-1" style={{ color: BK }}>Ecosistema buit</p>
              <p className="text-[12px] mb-5" style={{ color: LABEL }}>
                Comença afegint les persones que formen el teu entorn vital.
              </p>
              <Link href="/dashboard/diario/ecosistema/nova"
                className="px-4 py-2 rounded-xl text-[12px] font-bold"
                style={{ backgroundColor: R, color: "#FFF" }}>
                + Afegir primera persona
              </Link>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row">
              {/* Map */}
              <div className="flex-1 flex items-center justify-center p-4">
                <OrbitalMap
                  persones={persones}
                  onSelect={id => setSelectedId(id === selectedId ? null : id)}
                  selectedId={selectedId}
                />
              </div>

              {/* Side panel */}
              {selected ? (
                <div className="md:w-72 p-5 space-y-4" style={{ borderLeft: `1px solid ${BORDER}` }}>
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                      style={{ backgroundColor: CAT_BG[selected.categoria] }}>
                      {selected.avatar_emoji ?? "👤"}
                    </div>
                    <div>
                      <p className="text-[15px] font-bold" style={{ color: BK }}>{selected.nom}</p>
                      {selected.rol_vital && (
                        <p className="text-[11px]" style={{ color: LABEL }}>{selected.rol_vital}</p>
                      )}
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: CAT_BG[selected.categoria], color: CAT_COLOR[selected.categoria] }}>
                        {CAT_LABEL[selected.categoria]}
                      </span>
                    </div>
                  </div>

                  {selected.sensacio_post && (
                    <div className="rounded-lg p-3" style={{ backgroundColor: "#FBF8F5", border: `1px solid ${BORDER}` }}>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1" style={{ color: LABEL }}>
                        Sensació post-interacció
                      </p>
                      <p className="text-[12px] italic" style={{ color: "#5C5048" }}>
                        &ldquo;{selected.sensacio_post}&rdquo;
                      </p>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <ScoreBar label="Energia" value={selected.energia} />
                    <ScoreBar label="Claredat" value={selected.claredat} />
                    <ScoreBar label="Autenticitat" value={selected.autenticitat} />
                    <ScoreBar label="Confiança" value={selected.confianca} />
                    <ScoreBar label="Alineació vital" value={selected.alineacio} />
                  </div>

                  {selected.estat_relacional && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: LABEL }}>
                        Estat relacional
                      </p>
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                        style={{ backgroundColor: CAT_BG[selected.categoria], color: CAT_COLOR[selected.categoria] }}>
                        {selected.estat_relacional}
                      </span>
                    </div>
                  )}

                  {selected.notes && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1" style={{ color: LABEL }}>Notes</p>
                      <p className="text-[12px] leading-relaxed" style={{ color: "#5C5048" }}>{selected.notes}</p>
                    </div>
                  )}

                  <Link href={`/dashboard/diario/ecosistema/${selected.id}`}
                    className="block text-center py-2 rounded-xl text-[12px] font-bold transition-colors hover:opacity-90"
                    style={{ backgroundColor: R, color: "#FFF" }}>
                    Editar fitxa
                  </Link>
                </div>
              ) : (
                <div className="md:w-72 p-5 flex items-center justify-center"
                  style={{ borderLeft: `1px solid ${BORDER}` }}>
                  <p className="text-[12px] text-center" style={{ color: LABEL }}>
                    Clica una persona<br />per veure el seu perfil
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Category lists */}
      {activeTab !== "mapa" && (
        <div className="space-y-3">
          {persones.filter(p => p.categoria === activeTab).length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ border: `1px dashed ${BORDER}` }}>
              <p className="text-[12px] mb-3" style={{ color: LABEL }}>
                Cap persona en {CAT_LABEL[activeTab as Categoria].toLowerCase()} encara.
              </p>
              <Link href={`/dashboard/diario/ecosistema/nova?cat=${activeTab}`}
                className="text-[12px] font-semibold hover:underline" style={{ color: R }}>
                + Afegir persona
              </Link>
            </div>
          ) : (
            persones.filter(p => p.categoria === activeTab).map(p => (
              <PersonCard key={p.id} p={p}
                isSelected={selectedId === p.id}
                onSelect={() => setSelectedId(p.id === selectedId ? null : p.id)} />
            ))
          )}
        </div>
      )}

    </div>
  );
}

export { ESTAT_OPTIONS };
