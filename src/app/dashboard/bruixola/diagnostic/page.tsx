"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import {
  getDiagnostic,
  generateDiagnostic,
  getDiagnosticHistory,
  getDiagnosticById,
  previewPoblarBruixola,
  confirmPoblarBruixola,
  type PoblarPreview,
  type PoblarResultat,
} from "@/app/actions/bruixola";
import type { RichDiagnosticResult, EntitatsExtretes } from "@/lib/bruixola-prompts";

const CARD    = "#FFFFFF";
const SURFACE = "#F9FAFB";
const BORDER  = "#E5E7EB";
const BORDER2 = "#D1D5DB";
const TEXT    = "#111827";
const DIM     = "#6B7280";
const LABEL   = "#9CA3AF";
const RED     = "#8E0E1A";
const GREEN   = "#15803D";
const AMBER   = "#D97706";
const BLUE    = "#1D4ED8";
const GOLD    = "#B45309";

type HistoryItem = {
  id: string;
  data_diagnostic: string;
  versio: number;
  estat_global: string;
  revisada: boolean;
};

function SectionLabel({ children, color = LABEL }: { children: React.ReactNode; color?: string }) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color }}>
      {children}
    </p>
  );
}

function Card({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-2xl p-6 ${className}`}
      style={{ backgroundColor: CARD, border: `1px solid ${BORDER}`, ...style }}
    >
      {children}
    </div>
  );
}

function BulletList({ items, color, numbered = false }: { items: string[]; color: string; numbered?: boolean }) {
  if (!items?.length) return null;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="text-[10px] font-bold shrink-0 mt-0.5" style={{ color }}>
            {numbered ? `${i + 1}.` : "→"}
          </span>
          <p className="text-[12px] leading-relaxed" style={{ color: DIM }}>{item}</p>
        </li>
      ))}
    </ul>
  );
}

function AreaCard({ title, text }: { title: string; text: string }) {
  if (!text) return null;
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}>
      <p className="text-[8px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: LABEL }}>{title}</p>
      <p className="text-[11px] leading-relaxed" style={{ color: DIM }}>{text}</p>
    </div>
  );
}

function RoadmapCol({ label, focus, objectius, decisions, accions }: {
  label: string;
  focus: string;
  objectius: string[];
  decisions: string[];
  accions: string[];
}) {
  return (
    <div className="flex flex-col gap-4 p-5 rounded-xl" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}>
      <div>
        <p className="text-[8px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: GOLD }}>{label}</p>
        <p className="text-[12px] font-semibold leading-snug" style={{ color: TEXT }}>{focus}</p>
      </div>
      {objectius?.length > 0 && (
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.15em] mb-1.5" style={{ color: LABEL }}>Objectius</p>
          <BulletList items={objectius} color={BLUE} />
        </div>
      )}
      {decisions?.length > 0 && (
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.15em] mb-1.5" style={{ color: LABEL }}>Decisions</p>
          <BulletList items={decisions} color={AMBER} />
        </div>
      )}
      {accions?.length > 0 && (
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.15em] mb-1.5" style={{ color: LABEL }}>Accions</p>
          <BulletList items={accions} color={GREEN} />
        </div>
      )}
    </div>
  );
}

export default function DiagnosticPage() {
  const [d, setD] = useState<RichDiagnosticResult | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<string | null>(null);
  const [currentVersio, setCurrentVersio] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [error, setError] = useState("");
  const [isGenerating, startGenerateTransition] = useTransition();
  const [isDownloading, startDownloadTransition] = useTransition();
  const [isPreviewing, startPreviewTransition] = useTransition();
  const [isConfirming, startConfirmTransition] = useTransition();
  const [poblarPreview, setPoblarPreview] = useState<PoblarPreview | null>(null);
  const [pobrarResultat, setPobrarResultat] = useState<PoblarResultat | null>(null);

  async function reload() {
    setLoading(true);
    const [raw, hist] = await Promise.all([getDiagnostic(), getDiagnosticHistory()]);
    setHistory(hist);
    if (raw) {
      const rich = (raw as unknown as { full_data?: RichDiagnosticResult }).full_data ?? null;
      setD(rich);
      setCurrentId((raw as unknown as { id: string }).id ?? null);
      setCurrentDate((raw as unknown as { data_diagnostic: string }).data_diagnostic ?? null);
      setCurrentVersio((raw as unknown as { versio: number }).versio ?? null);
    }
    setLoading(false);
  }

  useEffect(() => { reload(); }, []);

  function handleGenerate() {
    setError("");
    startGenerateTransition(async () => {
      const res = await generateDiagnostic();
      if ("error" in res) {
        setError(res.error);
        return;
      }
      const hist = await getDiagnosticHistory();
      setHistory(hist);
      setD(res.data);
      if (hist[0]) {
        setCurrentId(hist[0].id);
        setCurrentDate(hist[0].data_diagnostic);
        setCurrentVersio(hist[0].versio);
      }
    });
  }

  async function handleLoadVersion(item: HistoryItem) {
    setHistoryOpen(false);
    setLoading(true);
    const rich = await getDiagnosticById(item.id);
    setD(rich);
    setCurrentId(item.id);
    setCurrentDate(item.data_diagnostic);
    setCurrentVersio(item.versio);
    setLoading(false);
  }

  function handleDownload() {
    startDownloadTransition(async () => {
      const res = await fetch("/api/diagnostic-pdf");
      if (!res.ok) { setError("Error generant el PDF"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "diagnostic-prospectia.pdf";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[12px]" style={{ color: LABEL }}>Carregant…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-5 md:px-8 py-10" style={{ backgroundColor: "#FFFFFF", minHeight: "100vh" }}>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="mb-3">
            <Link
              href="/dashboard/bruixola"
              className="text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-70 transition-opacity"
              style={{ color: LABEL }}
            >
              ← Brúixola
            </Link>
          </div>
          <h1 className="text-[28px] font-black leading-tight tracking-tight" style={{ color: TEXT }}>
            Diagnòstic Estratègic
          </h1>
          {d && currentDate && (
            <p className="text-[11px] mt-1" style={{ color: DIM }}>
              {new Date(currentDate).toLocaleDateString("ca-ES", { day: "numeric", month: "long", year: "numeric" })}
              {currentVersio && (
                <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider" style={{ backgroundColor: `${GOLD}15`, color: GOLD }}>
                  Versió {currentVersio}
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {history.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setHistoryOpen(v => !v)}
                className="px-3 py-2 rounded-xl text-[10px] font-bold transition-all hover:opacity-80"
                style={{ backgroundColor: SURFACE, color: DIM, border: `1px solid ${BORDER2}` }}
              >
                Historial ({history.length})
              </button>
              {historyOpen && (
                <div
                  className="absolute right-0 top-full mt-1 w-72 rounded-xl shadow-lg z-50 overflow-hidden"
                  style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}
                >
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleLoadVersion(item)}
                      className="w-full text-left px-4 py-3 hover:opacity-80 transition-opacity border-b last:border-b-0"
                      style={{ borderColor: BORDER }}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold" style={{ color: TEXT }}>Versió {item.versio}</p>
                        <p className="text-[9px]" style={{ color: LABEL }}>
                          {new Date(item.data_diagnostic).toLocaleDateString("ca-ES")}
                        </p>
                      </div>
                      <p className="text-[10px] mt-0.5 truncate" style={{ color: DIM }}>{item.estat_global}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {d && (
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-3 py-2 rounded-xl text-[10px] font-bold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: SURFACE, color: BLUE, border: `1px solid ${BLUE}30` }}
            >
              {isDownloading ? "Generant…" : "Descarregar PDF"}
            </button>
          )}
          {d && !poblarPreview && !pobrarResultat && (
            <button
              onClick={() => {
                setError("");
                startPreviewTransition(async () => {
                  const res = await previewPoblarBruixola();
                  if ("error" in res) { setError(res.error ?? "Error desconegut"); }
                  else { setPoblarPreview(res); }
                });
              }}
              disabled={isPreviewing}
              className="px-3 py-2 rounded-xl text-[10px] font-bold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: `${GREEN}10`, color: GREEN, border: `1px solid ${GREEN}40` }}
            >
              {isPreviewing ? <span className="flex items-center gap-1.5"><span className="animate-spin inline-block">◌</span> Analitzant…</span> : "Poblar Brúixola ✦"}
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-4 py-2 rounded-xl text-[11px] font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: d ? SURFACE : GOLD, color: d ? DIM : "#FFFFFF", border: d ? `1px solid ${BORDER2}` : "none" }}
          >
            {isGenerating ? (
              <span className="flex items-center gap-1.5">
                <span className="animate-spin inline-block">◌</span> Generant…
              </span>
            ) : d ? "Regenerar" : "Generar diagnòstic"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl p-3 mb-6" style={{ backgroundColor: `${RED}12`, border: `1px solid ${RED}25` }}>
          <p className="text-[11px]" style={{ color: RED }}>{error}</p>
        </div>
      )}

      {/* Preview panel — confirm before writing */}
      {poblarPreview && !pobrarResultat && (
        <div className="rounded-2xl overflow-hidden mb-6" style={{ border: `1px solid ${GREEN}35`, backgroundColor: CARD }}>
          <div className="px-5 py-3.5 flex items-center justify-between"
            style={{ backgroundColor: `${GREEN}06`, borderBottom: `1px solid ${GREEN}20` }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: GREEN }}>
                Poblar Brúixola — Revisió prèvia
              </p>
              <p className="text-[9px] mt-0.5" style={{ color: DIM }}>
                L&apos;IA ha extret les entitats següents. Revisa-les i confirma per guardar.
              </p>
            </div>
            <button onClick={() => setPoblarPreview(null)} className="text-[11px] hover:opacity-60" style={{ color: LABEL }}>✕</button>
          </div>
          <div className="p-5 space-y-4">
            {(["empreses", "actors", "productes", "projectes", "objectius"] as const).map(cat => {
              const nous = poblarPreview.nous[cat];
              const existents = poblarPreview.existents[cat];
              const label: Record<string, string> = { empreses: "Empreses", actors: "Actors", productes: "Productes", projectes: "Projectes", objectius: "Objectius" };
              if (nous.length === 0 && existents.length === 0) return null;
              return (
                <div key={cat}>
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: LABEL }}>{label[cat]}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {nous.map(nom => (
                      <span key={nom} className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ backgroundColor: `${GREEN}12`, color: GREEN, border: `1px solid ${GREEN}25` }}>
                        + {nom}
                      </span>
                    ))}
                    {existents.map(nom => (
                      <span key={nom} className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${LABEL}10`, color: LABEL, border: `1px solid ${LABEL}20`, textDecoration: "line-through" }}>
                        {nom}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}

            {Object.values(poblarPreview.nous).every(arr => arr.length === 0) && (
              <p className="text-[11px] text-center py-4" style={{ color: DIM }}>
                Totes les entitats detectades ja existeixen a Brúixola. No hi ha res nou a afegir.
              </p>
            )}

            {Object.values(poblarPreview.nous).some(arr => arr.length > 0) && (
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setPoblarPreview(null)}
                  className="px-4 py-2 rounded-xl text-[10px] font-semibold"
                  style={{ backgroundColor: SURFACE, color: DIM, border: `1px solid ${BORDER2}` }}>
                  Cancel·lar
                </button>
                <button
                  onClick={() => {
                    const entitats = poblarPreview.entitats;
                    setPoblarPreview(null);
                    startConfirmTransition(async () => {
                      const res = await confirmPoblarBruixola(entitats as EntitatsExtretes);
                      if ("error" in res) { setError(res.error ?? "Error desconegut"); }
                      else { setPobrarResultat(res); }
                    });
                  }}
                  disabled={isConfirming}
                  className="px-5 py-2 rounded-xl text-[10px] font-bold transition-all hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: GREEN, color: "#FFFFFF" }}>
                  {isConfirming ? "Guardant…" : "Confirmar i guardar"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {pobrarResultat && (
        <div className="rounded-xl p-4 mb-6 flex items-start justify-between gap-4" style={{ backgroundColor: `${GREEN}08`, border: `1px solid ${GREEN}30` }}>
          <div>
            <p className="text-[11px] font-bold mb-1" style={{ color: GREEN }}>Brúixola poblada correctament ✓</p>
            <p className="text-[10px]" style={{ color: DIM }}>
              {[
                pobrarResultat.empreses > 0 && `${pobrarResultat.empreses} empreses`,
                pobrarResultat.actors > 0 && `${pobrarResultat.actors} actors`,
                pobrarResultat.productes > 0 && `${pobrarResultat.productes} productes`,
                pobrarResultat.projectes > 0 && `${pobrarResultat.projectes} projectes`,
                pobrarResultat.objectius > 0 && `${pobrarResultat.objectius} objectius`,
              ].filter(Boolean).join(" · ")}
              {pobrarResultat.omesos > 0 && ` · ${pobrarResultat.omesos} ja existien (omesos)`}
            </p>
            <div className="flex gap-3 mt-2">
              <Link href="/dashboard/bruixola/empreses" className="text-[9px] font-bold hover:underline" style={{ color: GREEN }}>Veure empreses →</Link>
              <Link href="/dashboard/bruixola/projectes" className="text-[9px] font-bold hover:underline" style={{ color: GREEN }}>Veure projectes →</Link>
              <Link href="/dashboard/bruixola/objectius" className="text-[9px] font-bold hover:underline" style={{ color: GREEN }}>Veure objectius →</Link>
            </div>
          </div>
          <button onClick={() => setPobrarResultat(null)} className="text-[10px] hover:opacity-60" style={{ color: LABEL }}>✕</button>
        </div>
      )}

      {!d && !isGenerating && (
        <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: CARD, border: `1px dashed ${BORDER2}` }}>
          <p className="text-[13px] font-bold mb-2" style={{ color: TEXT }}>Cap diagnòstic generat</p>
          <p className="text-[11px] mb-6" style={{ color: DIM }}>
            Completa l&apos;anamnesi estratègica primer per obtenir un diagnòstic de qualitat.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/dashboard/bruixola/anamnesi"
              className="px-5 py-2.5 rounded-xl text-[11px] font-bold transition-all hover:opacity-80"
              style={{ backgroundColor: SURFACE, color: DIM, border: `1px solid ${BORDER2}` }}
            >
              Fer anamnesi
            </Link>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-5 py-2.5 rounded-xl text-[11px] font-bold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: GOLD, color: "#FFFFFF" }}
            >
              Generar igualment
            </button>
          </div>
        </div>
      )}

      {isGenerating && (
        <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="animate-spin text-xl" style={{ color: GOLD }}>◌</span>
            <p className="text-[13px] font-semibold" style={{ color: TEXT }}>Analitzant l&apos;empresa…</p>
          </div>
          <p className="text-[11px]" style={{ color: DIM }}>
            GPT-4o analitza objectius, projectes, anamnesi i KPIs. Pot trigar 20–40 segons.
          </p>
        </div>
      )}

      {d && !isGenerating && (
        <div className="space-y-6">

          <Card style={{ border: `2px solid ${RED}20` }}>
            <SectionLabel color={RED}>Estat Global</SectionLabel>
            <p className="text-[22px] font-black leading-tight tracking-tight mb-3" style={{ color: TEXT }}>{d.estat_global}</p>
            {d.dispersio_detectada && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: `${AMBER}12`, border: `1px solid ${AMBER}30` }}>
                <span className="text-[11px]" style={{ color: AMBER }}>⚠</span>
                <p className="text-[10px] font-bold" style={{ color: AMBER }}>Dispersió estratègica detectada</p>
              </div>
            )}
          </Card>

          <Card>
            <SectionLabel color={BLUE}>Visió Executiva</SectionLabel>
            <p className="text-[13px] leading-relaxed" style={{ color: TEXT }}>{d.visio_executiva}</p>
          </Card>

          <Card>
            <SectionLabel>Diagnòstic General</SectionLabel>
            <p className="text-[12px] leading-relaxed" style={{ color: DIM }}>{d.diagnostic_general}</p>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <SectionLabel color={RED}>Problema Central</SectionLabel>
              <p className="text-[12px] leading-relaxed" style={{ color: DIM }}>{d.problema_central}</p>
            </Card>
            <Card>
              <SectionLabel color={AMBER}>Dispersió</SectionLabel>
              {d.dispersio_detectada && (
                <p className="text-[9px] font-bold uppercase tracking-wider mb-2 inline-block px-2 py-0.5 rounded" style={{ backgroundColor: `${AMBER}15`, color: AMBER }}>
                  Detectada
                </p>
              )}
              <p className="text-[12px] leading-relaxed" style={{ color: DIM }}>{d.dispersio_detall}</p>
            </Card>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${GREEN}25`, backgroundColor: CARD }}>
              <div className="px-4 py-3" style={{ backgroundColor: `${GREEN}08`, borderBottom: `1px solid ${GREEN}20` }}>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: GREEN }}>Forces</p>
              </div>
              <div className="p-4">
                <BulletList items={d.forces} color={GREEN} />
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${RED}25`, backgroundColor: CARD }}>
              <div className="px-4 py-3" style={{ backgroundColor: `${RED}08`, borderBottom: `1px solid ${RED}20` }}>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: RED }}>Riscos</p>
              </div>
              <div className="p-4">
                <BulletList items={d.riscos} color={RED} />
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BLUE}25`, backgroundColor: CARD }}>
              <div className="px-4 py-3" style={{ backgroundColor: `${BLUE}08`, borderBottom: `1px solid ${BLUE}20` }}>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: BLUE }}>Oportunitats</p>
              </div>
              <div className="p-4">
                <BulletList items={d.oportunitats} color={BLUE} />
              </div>
            </div>
          </div>

          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: LABEL }}>Diagnòstic per Àrees</p>
            <div className="grid md:grid-cols-2 gap-3">
              <AreaCard title="Comercial" text={d.diagnostic_comercial} />
              <AreaCard title="Execució" text={d.diagnostic_execucio} />
              <AreaCard title="Estructura" text={d.diagnostic_estructura} />
              <AreaCard title="Focus" text={d.diagnostic_focus} />
              <AreaCard title="Dispersió" text={d.diagnostic_dispersio} />
              <AreaCard title="Equip" text={d.diagnostic_equip} />
              <AreaCard title="Pipeline" text={d.diagnostic_pipeline} />
              <AreaCard title="Financer" text={d.diagnostic_financera} />
            </div>
          </div>

          {d.prioritats?.length > 0 && (
            <Card>
              <SectionLabel color={GOLD}>Prioritats</SectionLabel>
              <BulletList items={d.prioritats} color={GOLD} numbered />
            </Card>
          )}

          {d.objectius_90_dies?.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: LABEL }}>Objectius 90 Dies</p>
              <div className="space-y-3">
                {d.objectius_90_dies.map((obj, i) => (
                  <div key={i} className="rounded-xl p-4" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <p className="text-[12px] font-bold" style={{ color: TEXT }}>{obj.titol}</p>
                      {obj.responsable && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded shrink-0" style={{ backgroundColor: `${BLUE}10`, color: BLUE }}>
                          {obj.responsable}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed mb-3" style={{ color: DIM }}>{obj.descripcio}</p>
                    {obj.kpis?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {obj.kpis.map((kpi, k) => (
                          <span key={k} className="text-[9px] px-2 py-0.5 rounded" style={{ backgroundColor: `${GOLD}12`, color: GOLD }}>
                            {kpi}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {d.objectius_12_mesos?.length > 0 && (
            <Card>
              <SectionLabel>Objectius 12 Mesos</SectionLabel>
              <div className="space-y-3">
                {d.objectius_12_mesos.map((obj, i) => (
                  <div key={i} className="pb-3 border-b last:border-b-0" style={{ borderColor: BORDER }}>
                    <p className="text-[11px] font-bold mb-1" style={{ color: TEXT }}>{obj.titol}</p>
                    <p className="text-[11px] leading-relaxed" style={{ color: DIM }}>{obj.descripcio}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {d.decisions_urgents?.length > 0 && (
            <div className="rounded-2xl p-6" style={{ backgroundColor: `${AMBER}06`, border: `1px solid ${AMBER}25` }}>
              <SectionLabel color={AMBER}>Decisions Urgents</SectionLabel>
              <BulletList items={d.decisions_urgents} color={AMBER} />
            </div>
          )}

          {(d.projectes_potenciar?.length > 0 || d.projectes_congelar?.length > 0) && (
            <div className="grid md:grid-cols-2 gap-4">
              {d.projectes_potenciar?.length > 0 && (
                <div className="rounded-2xl p-5" style={{ backgroundColor: `${GREEN}06`, border: `1px solid ${GREEN}20` }}>
                  <SectionLabel color={GREEN}>Projectes a Potenciar</SectionLabel>
                  <BulletList items={d.projectes_potenciar} color={GREEN} />
                </div>
              )}
              {d.projectes_congelar?.length > 0 && (
                <div className="rounded-2xl p-5" style={{ backgroundColor: `${LABEL}08`, border: `1px solid ${BORDER2}` }}>
                  <SectionLabel>Projectes a Congelar</SectionLabel>
                  <BulletList items={d.projectes_congelar} color={LABEL} />
                </div>
              )}
            </div>
          )}

          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: LABEL }}>Roadmap Estratègic</p>
            <div className="grid md:grid-cols-3 gap-4">
              <RoadmapCol
                label="30 Dies"
                focus={d.roadmap_30_dies?.focus}
                objectius={d.roadmap_30_dies?.objectius}
                decisions={d.roadmap_30_dies?.decisions}
                accions={d.roadmap_30_dies?.accions}
              />
              <RoadmapCol
                label="90 Dies"
                focus={d.roadmap_90_dies?.focus}
                objectius={d.roadmap_90_dies?.objectius}
                decisions={d.roadmap_90_dies?.decisions}
                accions={d.roadmap_90_dies?.accions}
              />
              <RoadmapCol
                label="12 Mesos"
                focus={d.roadmap_12_mesos?.focus}
                objectius={d.roadmap_12_mesos?.objectius}
                decisions={d.roadmap_12_mesos?.decisions}
                accions={d.roadmap_12_mesos?.accions}
              />
            </div>
          </div>

          {d.consultoria && (
            <div className="rounded-2xl p-6" style={{ backgroundColor: CARD, border: `2px solid ${RED}30` }}>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1 h-6 rounded-full" style={{ backgroundColor: RED }} />
                <SectionLabel color={RED}>Consultoria Executiva</SectionLabel>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                {d.consultoria.que_faria && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1.5" style={{ color: LABEL }}>Que faria jo</p>
                    <p className="text-[11px] leading-relaxed" style={{ color: DIM }}>{d.consultoria.que_faria}</p>
                  </div>
                )}
                {d.consultoria.mal_enfocat && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1.5" style={{ color: LABEL }}>Mal enfocat</p>
                    <p className="text-[11px] leading-relaxed" style={{ color: DIM }}>{d.consultoria.mal_enfocat}</p>
                  </div>
                )}
                {d.consultoria.on_perdent_energia && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1.5" style={{ color: LABEL }}>On perdeu energia</p>
                    <p className="text-[11px] leading-relaxed" style={{ color: DIM }}>{d.consultoria.on_perdent_energia}</p>
                  </div>
                )}
                {d.consultoria.potencial_real && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1.5" style={{ color: LABEL }}>Potencial real</p>
                    <p className="text-[11px] leading-relaxed" style={{ color: DIM }}>{d.consultoria.potencial_real}</p>
                  </div>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-5 mt-5 pt-5" style={{ borderTop: `1px solid ${BORDER}` }}>
                {d.consultoria.decisions_inajornables?.length > 0 && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: AMBER }}>Decisions inajornables</p>
                    <BulletList items={d.consultoria.decisions_inajornables} color={AMBER} />
                  </div>
                )}
                {d.consultoria.projectes_sense_sentit?.length > 0 && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: LABEL }}>Projectes sense sentit</p>
                    <BulletList items={d.consultoria.projectes_sense_sentit} color={LABEL} />
                  </div>
                )}
                {d.consultoria.que_professionalitzar?.length > 0 && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: BLUE }}>Que professionalitzar</p>
                    <BulletList items={d.consultoria.que_professionalitzar} color={BLUE} />
                  </div>
                )}
                {d.consultoria.sistemes_falten?.length > 0 && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: GREEN }}>Sistemes que falten</p>
                    <BulletList items={d.consultoria.sistemes_falten} color={GREEN} />
                  </div>
                )}
              </div>
            </div>
          )}

          {d.conclusions_finals && (
            <Card>
              <SectionLabel>Conclusions Finals</SectionLabel>
              <p className="text-[12px] leading-relaxed" style={{ color: DIM }}>{d.conclusions_finals}</p>
            </Card>
          )}

          {d.recomanacio_principal && (
            <div className="rounded-2xl p-6" style={{ backgroundColor: `${GOLD}08`, border: `2px solid ${GOLD}30` }}>
              <SectionLabel color={GOLD}>Recomanació Principal</SectionLabel>
              <p className="text-[15px] font-semibold leading-relaxed" style={{ color: TEXT }}>{d.recomanacio_principal}</p>
            </div>
          )}

        </div>
      )}

      <div className="pt-8 flex justify-center">
        <Link
          href="/dashboard/bruixola/anamnesi"
          className="text-[10px] hover:opacity-70 transition-opacity"
          style={{ color: LABEL }}
        >
          Refinar l&apos;anamnesi per millorar el diagnòstic →
        </Link>
      </div>

    </div>
  );
}
