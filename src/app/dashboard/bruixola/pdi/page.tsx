"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { getPDIActors, exportPDI, getPDIExports } from "@/app/actions/strategic-actors";
import type { StrategicActor, PDIExport } from "@/app/actions/strategic-actors";

const CARD    = "#FFFFFF";
const SURFACE = "#F8FAFC";
const BORDER  = "#E2E8F0";
const TEXT    = "#0F172A";
const DIM     = "#475569";
const LABEL   = "#94A3B8";
const GREEN   = "#166534";
const RED     = "#991B1B";
const AMBER   = "#92400E";
const PURPLE  = "#6B21A8";

const RISC_COLORS: Record<string, string> = { baix: GREEN, mitja: AMBER, alt: RED, critic: "#7F1D1D", desconegut: LABEL };
const POT_COLORS: Record<string, string> = { molt_alt: GREEN, alt: "#1D4ED8", mitja: AMBER, baix: RED, incert: LABEL, no_validat: LABEL };

function PDICard({ actor }: { actor: StrategicActor }) {
  const [exports, setExports] = useState<PDIExport[]>([]);
  const [isExporting, startExport] = useTransition();
  const [exportPreview, setExportPreview] = useState<Record<string, unknown> | null>(null);
  const [showExports, setShowExports] = useState(false);

  useEffect(() => {
    getPDIExports(actor.id).then(setExports);
  }, [actor.id]);

  function handleExport() {
    startExport(async () => {
      const { contingut } = await exportPDI(actor.id);
      setExportPreview(contingut);
      const fresh = await getPDIExports(actor.id);
      setExports(fresh);
    });
  }

  const potColor = POT_COLORS[actor.classificacio_potencial ?? ""] ?? LABEL;
  const riscColor = RISC_COLORS[actor.classificacio_risc ?? ""] ?? LABEL;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: CARD, border: `1px solid ${PURPLE}25` }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-start justify-between gap-3"
        style={{ backgroundColor: `${PURPLE}06`, borderBottom: `1px solid ${PURPLE}15` }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest"
              style={{ backgroundColor: `${PURPLE}15`, color: PURPLE, border: `1px solid ${PURPLE}30` }}>PDI</span>
            {actor.classificacio_potencial && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase"
                style={{ backgroundColor: `${potColor}12`, color: potColor, border: `1px solid ${potColor}25` }}>
                Pot. {actor.classificacio_potencial.replace("_", " ")}
              </span>
            )}
            {actor.classificacio_risc && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase"
                style={{ backgroundColor: `${riscColor}12`, color: riscColor, border: `1px solid ${riscColor}25` }}>
                Risc {actor.classificacio_risc}
              </span>
            )}
          </div>
          <Link href={`/dashboard/bruixola/actors/${actor.id}`}
            className="text-[15px] font-bold hover:opacity-70 transition-opacity" style={{ color: TEXT }}>
            {actor.nom}
          </Link>
          <p className="text-[11px] mt-0.5" style={{ color: DIM }}>
            {[actor.carrec, actor.empresa].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setShowExports(!showExports)}
            className="px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all hover:opacity-70"
            style={{ backgroundColor: SURFACE, color: LABEL, border: `1px solid ${BORDER}` }}>
            {exports.length} export{exports.length !== 1 ? "s" : ""}
          </button>
          <button onClick={handleExport} disabled={isExporting}
            className="px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all hover:opacity-80 disabled:opacity-40"
            style={{ backgroundColor: PURPLE, color: "#FFFFFF" }}>
            {isExporting ? "Exportant…" : "Exportar →"}
          </button>
        </div>
      </div>

      {/* PDI details */}
      <div className="px-5 py-4 space-y-3">
        {actor.motiu_pdi && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: LABEL }}>Motiu PDI</p>
            <p className="text-[11px]" style={{ color: DIM }}>{actor.motiu_pdi}</p>
          </div>
        )}
        {actor.tipus_influencia_pdi && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: LABEL }}>Tipus d&apos;influència</p>
            <p className="text-[11px]" style={{ color: DIM }}>{actor.tipus_influencia_pdi}</p>
          </div>
        )}
        {actor.estrategia_ia && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: LABEL }}>Estratègia IA</p>
            <p className="text-[11px] leading-relaxed line-clamp-3" style={{ color: DIM }}>{actor.estrategia_ia}</p>
          </div>
        )}
        {actor.pdi_notes && (
          <div className="rounded-lg p-3" style={{ backgroundColor: `${PURPLE}06`, border: `1px solid ${PURPLE}15` }}>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: PURPLE }}>Notes PDI</p>
            <p className="text-[11px] leading-relaxed" style={{ color: DIM }}>{actor.pdi_notes}</p>
          </div>
        )}
      </div>

      {/* Export preview */}
      {exportPreview && (
        <div className="px-5 pb-4">
          <div className="rounded-lg p-3" style={{ backgroundColor: `${PURPLE}06`, border: `1px solid ${PURPLE}20` }}>
            <p className="text-[8px] font-bold uppercase tracking-wider mb-2" style={{ color: PURPLE }}>
              Exportat — Previsualització
            </p>
            <pre className="text-[9px] leading-relaxed overflow-x-auto" style={{ color: DIM }}>
              {JSON.stringify(exportPreview, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Export history */}
      {showExports && exports.length > 0 && (
        <div className="px-5 pb-4">
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
            <div className="px-4 py-2" style={{ backgroundColor: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
              <p className="text-[8px] font-bold uppercase tracking-wider" style={{ color: LABEL }}>
                Historial d&apos;exports ({exports.length})
              </p>
            </div>
            <div className="divide-y" style={{ borderColor: BORDER }}>
              {exports.map(exp => (
                <div key={exp.id} className="px-4 py-2.5 flex items-center justify-between">
                  <p className="text-[10px]" style={{ color: DIM }}>
                    {new Date(exp.data_export).toLocaleString("ca-ES", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                  {exp.notes && <p className="text-[10px]" style={{ color: LABEL }}>{exp.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PDIPage() {
  const [actors, setActors] = useState<StrategicActor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPDIActors().then(data => {
      setActors(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-5 md:px-10 py-10 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <Link href="/dashboard/bruixola/actors"
              className="text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-70"
              style={{ color: LABEL }}>
              ← Actors
            </Link>
          </div>
          <h1 className="text-[26px] font-black leading-tight tracking-tight" style={{ color: TEXT }}>
            PDI — Persones d&apos;Interès
          </h1>
          <p className="text-[11px] mt-1" style={{ color: DIM }}>
            {actors.length} actor{actors.length !== 1 ? "s" : ""} marcats com PDI · Exportació controlada al Diari
          </p>
        </div>
        <Link href="/dashboard/bruixola/actors"
          className="px-4 py-2 rounded-xl text-[10px] font-bold transition-all hover:opacity-80 shrink-0"
          style={{ backgroundColor: `${PURPLE}12`, color: PURPLE, border: `1px solid ${PURPLE}25` }}>
          + Gestionar actors
        </Link>
      </div>

      {/* Avís */}
      <div className="rounded-xl p-4 flex gap-3" style={{ backgroundColor: `${PURPLE}06`, border: `1px solid ${PURPLE}20` }}>
        <div className="w-0.5 rounded-full shrink-0" style={{ backgroundColor: PURPLE }} />
        <div>
          <p className="text-[11px] font-semibold mb-0.5" style={{ color: PURPLE }}>Exportació controlada</p>
          <p className="text-[10px] leading-relaxed" style={{ color: DIM }}>
            L&apos;exportació PDI envia al Diari només camps no sensibles: nom, empresa, càrrec, rol, classificació, estratègia IA i notes PDI.
            Cap email, telèfon, notes confidencials ni dades financeres.
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-20">
          <p className="text-[12px]" style={{ color: LABEL }}>Carregant PDIs…</p>
        </div>
      )}

      {/* Empty */}
      {!loading && actors.length === 0 && (
        <div className="rounded-2xl p-14 text-center" style={{ backgroundColor: SURFACE, border: `1px dashed ${BORDER}` }}>
          <p className="text-[13px] font-bold mb-2" style={{ color: TEXT }}>Cap PDI registrat</p>
          <p className="text-[11px] mb-6 max-w-md mx-auto" style={{ color: DIM }}>
            Marca actors com a PDI des de la seva fitxa (pestanya Anàlisi IA) per gestionar-los aquí i exportar-los al Diari.
          </p>
          <Link href="/dashboard/bruixola/actors"
            className="inline-block px-5 py-2.5 rounded-xl text-[11px] font-bold transition-all hover:opacity-80"
            style={{ backgroundColor: TEXT, color: "#FFFFFF" }}>
            Veure actors
          </Link>
        </div>
      )}

      {/* PDI list */}
      {!loading && actors.length > 0 && (
        <div className="space-y-4">
          {actors.map(actor => <PDICard key={actor.id} actor={actor} />)}
        </div>
      )}
    </div>
  );
}
