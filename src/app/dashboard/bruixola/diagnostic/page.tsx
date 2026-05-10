"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { getDiagnostic, generateDiagnostic } from "@/app/actions/bruixola";
import type { Diagnostic } from "@/app/actions/bruixola";

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

function Section({ title, color, items, icon }: { title: string; color: string; items: string[]; icon: string }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${color}25`, backgroundColor: CARD }}>
      <div className="px-4 py-3 flex items-center gap-2"
        style={{ backgroundColor: `${color}08`, borderBottom: `1px solid ${color}20` }}>
        <span className="text-sm">{icon}</span>
        <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color }}>{title}</p>
      </div>
      <ul className="p-4 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: color }} />
            <p className="text-[12px] leading-relaxed" style={{ color: DIM }}>{item}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ListSection({ title, color, items, icon }: { title: string; color: string; items: string[]; icon: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span>{icon}</span>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color }}>{title}</p>
      </div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-[9px] mt-0.5 shrink-0" style={{ color }}>→</span>
            <p className="text-[11px] leading-relaxed" style={{ color: DIM }}>{item}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DiagnosticPage() {
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, startGenerateTransition] = useTransition();
  const [error, setError] = useState("");

  async function reload() {
    const d = await getDiagnostic();
    setDiagnostic(d);
    setLoading(false);
  }

  useEffect(() => { reload(); }, []);

  function handleGenerate() {
    setError("");
    startGenerateTransition(async () => {
      try {
        await generateDiagnostic();
        await reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error generant el diagnòstic");
      }
    });
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-[12px]" style={{ color: LABEL }}>Carregant…</p>
    </div>
  );

  const d = diagnostic;

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-10 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <Link href="/dashboard/bruixola" className="text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-70" style={{ color: LABEL }}>
              ← Brúixola
            </Link>
          </div>
          <h1 className="text-[26px] font-black leading-tight tracking-tight" style={{ color: TEXT }}>Diagnòstic IA</h1>
          {d && (
            <p className="text-[11px] mt-1" style={{ color: DIM }}>
              Generat: {new Date(d.data_diagnostic).toLocaleDateString("ca-ES", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        <button onClick={handleGenerate} disabled={isGenerating}
          className="px-4 py-2.5 rounded-xl text-[11px] font-bold shrink-0 transition-all hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: d ? SURFACE : GOLD, color: d ? DIM : "#FFFFFF", border: d ? `1px solid ${BORDER2}` : "none" }}>
          {isGenerating ? (
            <span className="flex items-center gap-1.5">
              <span className="animate-spin">◌</span> Generant…
            </span>
          ) : d ? "Regenerar" : "Generar diagnòstic"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl p-3" style={{ backgroundColor: `${RED}18`, border: `1px solid ${RED}30` }}>
          <p className="text-[11px]" style={{ color: RED }}>{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!d && !isGenerating && (
        <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: CARD, border: `1px dashed ${BORDER2}` }}>
          <p className="text-[13px] font-bold mb-2" style={{ color: TEXT }}>Cap diagnòstic generat</p>
          <p className="text-[11px] mb-6" style={{ color: DIM }}>
            Completa l&apos;anamnesi estratègica primer per obtenir un diagnòstic de qualitat.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/dashboard/bruixola/anamnesi"
              className="px-5 py-2.5 rounded-xl text-[11px] font-bold transition-all hover:opacity-80"
              style={{ backgroundColor: SURFACE, color: DIM, border: `1px solid ${BORDER2}` }}>
              Fer anamnesi
            </Link>
            <button onClick={handleGenerate} disabled={isGenerating}
              className="px-5 py-2.5 rounded-xl text-[11px] font-bold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: GOLD, color: "#FFFFFF" }}>
              Generar igualment
            </button>
          </div>
        </div>
      )}

      {/* Generating */}
      {isGenerating && (
        <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="animate-spin text-xl" style={{ color: GOLD }}>◌</span>
            <p className="text-[13px] font-semibold" style={{ color: TEXT }}>Analitzant l&apos;empresa…</p>
          </div>
          <p className="text-[11px]" style={{ color: DIM }}>
            Claude Sonnet analitza objectius, projectes, anamnesi i KPIs. Pot trigar 20–40 segons.
          </p>
        </div>
      )}

      {/* Diagnostic content */}
      {d && !isGenerating && (
        <>
          {/* Estat global */}
          {d.estat_global && (
            <div className="rounded-2xl p-6" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: GOLD }}>Estat Global</p>
              <p className="text-[18px] font-black leading-tight" style={{ color: TEXT }}>{d.estat_global}</p>
              {d.resum_executiu && (
                <p className="text-[12px] leading-relaxed mt-3" style={{ color: DIM }}>{d.resum_executiu}</p>
              )}
              {d.dispersio_detectada && (
                <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: `${AMBER}12`, border: `1px solid ${AMBER}25` }}>
                  <span style={{ color: AMBER }}>⚠</span>
                  <p className="text-[11px] font-semibold" style={{ color: AMBER }}>Dispersió estratègica detectada</p>
                </div>
              )}
            </div>
          )}

          {/* Focus recomanat */}
          {d.focus_recomanat && (
            <div className="rounded-xl p-4" style={{ backgroundColor: `${GOLD}08`, border: `1px solid ${GOLD}25` }}>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: GOLD }}>Focus Recomanat</p>
              <p className="text-[14px] font-semibold leading-relaxed" style={{ color: TEXT }}>{d.focus_recomanat}</p>
            </div>
          )}

          {/* 4 main sections */}
          <div className="grid md:grid-cols-2 gap-4">
            <Section title="Forces" color={GREEN} items={d.forces} icon="↑" />
            <Section title="Riscos" color={RED} items={d.riscos} icon="⚠" />
            <Section title="Oportunitats" color={BLUE} items={d.oportunitats} icon="→" />
            <Section title="Problemes" color={AMBER} items={d.problemes} icon="!" />
          </div>

          {/* Action sections */}
          {(d.projectes_potenciar.length > 0 || d.projectes_congelar.length > 0 ||
            d.decisions_pendents.length > 0 || d.seguents_accions.length > 0) && (
            <div className="rounded-xl p-5 space-y-5" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
              <ListSection title="Projectes a potenciar" color={GREEN} items={d.projectes_potenciar} icon="✓" />
              <ListSection title="Projectes a congelar" color={LABEL} items={d.projectes_congelar} icon="✕" />
              <ListSection title="Decisions pendents" color={AMBER} items={d.decisions_pendents} icon="?" />
              <ListSection title="Seguents accions" color={GOLD} items={d.seguents_accions} icon="→" />
            </div>
          )}

          {/* Recommendation */}
          {d.recomanacio && (
            <div className="rounded-xl p-5" style={{ backgroundColor: `${BLUE}08`, border: `1px solid ${BLUE}25` }}>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: BLUE }}>Recomanació Estratègica</p>
              <p className="text-[12px] leading-relaxed" style={{ color: DIM }}>{d.recomanacio}</p>
            </div>
          )}
        </>
      )}

      {/* Nav bottom */}
      <div className="pt-4 flex justify-center">
        <Link href="/dashboard/bruixola/anamnesi"
          className="text-[10px] hover:opacity-70 transition-opacity"
          style={{ color: LABEL }}>
          Refinar l&apos;anamnesi per millorar el diagnòstic →
        </Link>
      </div>
    </div>
  );
}
