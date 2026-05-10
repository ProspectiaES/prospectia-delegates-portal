"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { nextAnamnesiQuestion, generateDiagnostic, resetAnamnesi } from "@/app/actions/bruixola";
import type { AnamnesiTorn } from "@/lib/bruixola-prompts";

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
const GREEN   = "#15803D";
const BLUE    = "#1D4ED8";

const FASE_INFO: Record<number, { label: string; desc: string; color: string }> = {
  1: { label: "Mapa Empresarial",     desc: "Estructura, empreses, marques, línies de negoci", color: BLUE },
  2: { label: "Actors i Rols",        desc: "Qui decideix, qui executa, qui bloqueja",          color: GOLD },
  3: { label: "Productes i Projectes", desc: "Estat actual, caixa, esforç, viabilitat",         color: "#9C6ACA" },
  4: { label: "Realitat Empresarial", desc: "Problemes reals, colls d'ampolla, decisions",       color: "#DC2626" },
  5: { label: "Construcció Objectius", desc: "Convertir el caos en direcció executable",         color: GREEN },
};

const FASE_COLORS = Object.fromEntries(Object.entries(FASE_INFO).map(([k, v]) => [k, v.color]));

interface Props {
  historialInicial: AnamnesiTorn[];
}

export function AnamnesiClient({ historialInicial }: Props) {
  const router = useRouter();
  const [historial, setHistorial] = useState<AnamnesiTorn[]>(historialInicial);
  const [faseActual, setFaseActual] = useState<number>(() => {
    if (historialInicial.length === 0) return 1;
    const pendent = historialInicial.find(t => !t.resposta);
    return pendent?.fase ?? historialInicial[historialInicial.length - 1]?.fase ?? 1;
  });
  const [preguntaActual, setPreguntaActual] = useState<string>(() => {
    const pendent = historialInicial.find(t => !t.resposta);
    return pendent?.pregunta ?? "";
  });
  const [observacio, setObservacio] = useState<string | null>(null);
  const [resposta, setResposta] = useState("");
  const [showExport, setShowExport] = useState(false);
  const [copyOk, setCopyOk] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isGenerating, startGenerateTransition] = useTransition();
  const [isResetting, startResetTransition] = useTransition();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [diagnosticGenerat, setDiagnosticGenerat] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fase5Complete = historial.filter(t => t.fase === 5 && t.resposta).length >= 2;
  const totalFasesCompletes = new Set(historial.filter(t => t.resposta).map(t => t.fase)).size;
  const isFirstQuestion = historial.length === 0 && !preguntaActual;
  const DRAFT_KEY = "anamnesi-draft";

  // Restore draft when question loads
  useEffect(() => {
    if (!preguntaActual) return;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const { q, t } = JSON.parse(saved) as { q: string; t: string };
        if (q === preguntaActual) setResposta(t);
      }
    } catch { /* ignore */ }
  }, [preguntaActual]);

  // Auto-save draft on every keystroke
  function handleRespostaChange(v: string) {
    setResposta(v);
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ q: preguntaActual, t: v })); } catch { /* ignore */ }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [historial, preguntaActual]);

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.focus();
  }, [preguntaActual]);

  async function handleStart() {
    startTransition(async () => {
      try {
        setError("");
        const result = await nextAnamnesiQuestion(1, "", "");
        setPreguntaActual(result.pregunta);
        setFaseActual(result.fase_seguent ?? 1);
        setObservacio(result.observacio);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error iniciando la anamnesi");
      }
    });
  }

  async function handleEnviar() {
    if (!resposta.trim() || !preguntaActual) return;
    const respostaTrim = resposta.trim();
    setResposta("");
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }

    const historialAmbResposta = [...historial, { fase: faseActual, pregunta: preguntaActual, resposta: respostaTrim }];
    setHistorial(historialAmbResposta);
    setPreguntaActual("");
    setObservacio(null);

    startTransition(async () => {
      try {
        setError("");
        const result = await nextAnamnesiQuestion(faseActual, respostaTrim, preguntaActual);
        if (result.fase_seguent && result.fase_seguent !== faseActual) {
          setFaseActual(result.fase_seguent);
        }
        setPreguntaActual(result.pregunta);
        setObservacio(result.observacio);
        if (result.fase_completa && faseActual >= 5) {
          setDone(true);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al processar la resposta");
      }
    });
  }

  async function handleGenerarDiagnostic() {
    startGenerateTransition(async () => {
      try {
        setError("");
        await generateDiagnostic();
        setDiagnosticGenerat(true);
        router.push("/dashboard/bruixola/diagnostic");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error generant el diagnòstic");
      }
    });
  }

  function handleReset() {
    if (!confirm("Reiniciar l'anamnesi? Es perdran totes les respostes anteriors.")) return;
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    startResetTransition(async () => {
      await resetAnamnesi();
      setHistorial([]);
      setFaseActual(1);
      setPreguntaActual("");
      setResposta("");
      setDone(false);
      setDiagnosticGenerat(false);
    });
  }

  function handleCopyAll() {
    const answered = historial.filter(t => t.resposta);
    const text = answered.map((t, i) =>
      `[F${t.fase}] Pregunta ${i + 1}:\n${t.pregunta}\n\nResposta:\n${t.resposta}`
    ).join("\n\n---\n\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopyOk(true);
      setTimeout(() => setCopyOk(false), 2000);
    });
  }

  const faseColor = FASE_COLORS[faseActual] ?? GOLD;
  const faseInfo = FASE_INFO[faseActual];

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-10">

      {/* Nav */}
      <div className="flex items-center justify-between mb-10">
        <Link href="/dashboard/bruixola"
          className="text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-70"
          style={{ color: LABEL }}>
          ← Brúixola
        </Link>
        <div className="flex items-center gap-3">
          {historial.filter(t => t.resposta).length > 0 && (
            <button onClick={() => setShowExport(!showExport)}
              className="text-[10px] font-semibold px-3 py-1.5 rounded-lg hover:opacity-70 transition-opacity"
              style={{ color: BLUE, border: `1px solid ${BLUE}30`, backgroundColor: `${BLUE}06` }}>
              {showExport ? "Tancar" : "Veure respostes"}
            </button>
          )}
          {historial.length > 0 && (
            <button onClick={handleReset} disabled={isResetting}
              className="text-[10px] hover:opacity-70 transition-opacity"
              style={{ color: LABEL }}>
              {isResetting ? "Reiniciant…" : "Reiniciar"}
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="mb-8">
        <p className="text-[9px] font-bold uppercase tracking-[0.35em] mb-2" style={{ color: LABEL }}>
          Anamnesi Estratègica
        </p>
        <h1 className="text-[26px] font-black leading-tight tracking-tight mb-2" style={{ color: TEXT }}>
          Entendre l&apos;empresa
        </h1>
        <p className="text-[11px] leading-relaxed" style={{ color: DIM }}>
          Un procés adaptatiu per construir el mapa estratègic real. Respon amb honestedat i concreció.
        </p>
      </div>

      {/* Phase progress */}
      <div className="flex gap-1.5 mb-8">
        {[1, 2, 3, 4, 5].map(f => {
          const faseDones = historial.filter(t => t.fase === f && t.resposta).length;
          const isActive = f === faseActual;
          const isDone = totalFasesCompletes >= f && f < faseActual;
          const c = FASE_COLORS[f];
          return (
            <div key={f} className="flex-1">
              <div className="h-0.5 rounded-full mb-1.5"
                style={{ backgroundColor: isDone ? c : isActive ? c : BORDER2, opacity: isActive ? 1 : isDone ? 0.6 : 0.3 }} />
              <p className="text-[8px] font-bold uppercase tracking-wide hidden md:block"
                style={{ color: isActive ? c : isDone ? `${c}80` : LABEL }}>
                F{f} · {FASE_INFO[f].label}
              </p>
              <p className="text-[8px] font-bold uppercase tracking-wide md:hidden"
                style={{ color: isActive ? c : LABEL }}>
                F{f} {faseDones > 0 ? `(${faseDones})` : ""}
              </p>
            </div>
          );
        })}
      </div>

      {/* Export panel */}
      {showExport && historial.filter(t => t.resposta).length > 0 && (
        <div className="rounded-2xl overflow-hidden mb-8" style={{ border: `1px solid ${BORDER}`, backgroundColor: CARD }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: LABEL }}>
              Respostes guardades — {historial.filter(t => t.resposta).length} preguntes
            </p>
            <button onClick={handleCopyAll}
              className="text-[9px] font-bold px-3 py-1 rounded-lg transition-all hover:opacity-80"
              style={{ backgroundColor: copyOk ? GREEN : GOLD, color: "#FFFFFF" }}>
              {copyOk ? "✓ Copiat!" : "Copiar tot"}
            </button>
          </div>
          <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
            {historial.filter(t => t.resposta).map((t, i) => {
              const fc = FASE_COLORS[t.fase] ?? GOLD;
              return (
                <div key={i} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
                  <div className="px-3 py-1.5 flex items-center gap-2" style={{ backgroundColor: `${fc}10`, borderBottom: `1px solid ${fc}20` }}>
                    <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: fc }}>
                      F{t.fase} · {FASE_INFO[t.fase]?.label}
                    </span>
                    <span className="text-[8px]" style={{ color: LABEL }}>· P{i + 1}</span>
                  </div>
                  <div className="p-3 space-y-2">
                    <p className="text-[11px]" style={{ color: DIM }}>{t.pregunta}</p>
                    <div className="rounded-lg p-3" style={{ backgroundColor: SURFACE }}>
                      <p className="text-[12px] leading-relaxed whitespace-pre-line" style={{ color: TEXT }}>{t.resposta}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Historial */}
      {historial.filter(t => t.resposta).length > 0 && (
        <div className="space-y-4 mb-8">
          {historial.filter(t => t.resposta).map((torn, i) => {
            const fc = FASE_COLORS[torn.fase] ?? GOLD;
            return (
              <div key={i}>
                {/* Pregunta */}
                <div className="flex gap-3 mb-2">
                  <div className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold shrink-0 mt-0.5"
                    style={{ backgroundColor: `${fc}18`, color: fc, border: `1px solid ${fc}30` }}>
                    IA
                  </div>
                  <p className="text-[12px] leading-relaxed pt-0.5" style={{ color: DIM }}>{torn.pregunta}</p>
                </div>
                {/* Resposta */}
                <div className="ml-8 rounded-xl p-3"
                  style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}>
                  <p className="text-[12px] leading-relaxed" style={{ color: TEXT }}>{torn.resposta}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Current question / Start state */}
      {isFirstQuestion && !isPending && (
        <div className="rounded-2xl p-8 text-center mb-6"
          style={{ backgroundColor: CARD, border: `1px dashed ${BORDER2}` }}>
          <p className="text-[13px] font-bold mb-2" style={{ color: TEXT }}>
            Preparat per construir la direcció de l&apos;empresa?
          </p>
          <p className="text-[11px] mb-6" style={{ color: DIM }}>
            5 fases · ~20 minuts · Totalment adaptativa
          </p>
          <button onClick={handleStart}
            className="px-6 py-3 rounded-xl text-[12px] font-bold transition-all hover:opacity-80"
            style={{ backgroundColor: GOLD, color: "#FFFFFF" }}>
            Iniciar Anamnesi Estratègica
          </button>
        </div>
      )}

      {/* Loading */}
      {isPending && (
        <div className="rounded-2xl p-8 text-center mb-6"
          style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-center gap-2">
            <span className="animate-spin text-lg" style={{ color: faseColor }}>◌</span>
            <p className="text-[12px]" style={{ color: DIM }}>Processant…</p>
          </div>
        </div>
      )}

      {/* Active question */}
      {preguntaActual && !isPending && !done && (
        <div className="rounded-2xl overflow-hidden mb-4"
          style={{ border: `1px solid ${faseColor}30`, backgroundColor: CARD }}>
          {/* Phase label */}
          <div className="px-5 py-3 flex items-center gap-2.5"
            style={{ backgroundColor: `${faseColor}08`, borderBottom: `1px solid ${faseColor}20` }}>
            <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: faseColor }} />
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: faseColor }}>
                Fase {faseActual} · {faseInfo?.label}
              </p>
              <p className="text-[8px]" style={{ color: LABEL }}>{faseInfo?.desc}</p>
            </div>
          </div>

          <div className="p-6">
            {/* Observació */}
            {observacio && (
              <div className="rounded-lg p-3 mb-4" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}>
                <p className="text-[10px] leading-relaxed italic" style={{ color: DIM }}>{observacio}</p>
              </div>
            )}

            {/* Pregunta */}
            <p className="text-[16px] font-semibold leading-relaxed mb-5" style={{ color: TEXT }}>
              {preguntaActual}
            </p>

            {/* Input */}
            <textarea
              ref={textareaRef}
              value={resposta}
              onChange={e => handleRespostaChange(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleEnviar(); }}
              placeholder="Respon amb honestedat i concreció…"
              rows={4}
              className="w-full rounded-xl outline-none resize-none text-[13px] leading-relaxed p-4"
              style={{
                backgroundColor: SURFACE,
                border: `1px solid ${BORDER2}`,
                color: TEXT,
              }}
              onFocus={e => (e.target.style.borderColor = faseColor)}
              onBlur={e => (e.target.style.borderColor = BORDER2)}
            />

            <div className="flex items-center justify-between mt-3">
              <p className="text-[9px]" style={{ color: LABEL }}>
                {resposta.trim() ? "✓ Esborrany guardat localment · " : ""}⌘↵ per enviar
              </p>
              <button
                onClick={handleEnviar}
                disabled={!resposta.trim() || isPending}
                className="px-5 py-2 rounded-lg text-[11px] font-bold transition-all disabled:opacity-30 hover:opacity-80"
                style={{ backgroundColor: faseColor, color: "#FFFFFF" }}>
                Continuar →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Done / Generate diagnostic */}
      {(done || fase5Complete || (historial.filter(t => t.resposta).length >= 10)) && (
        <div className="rounded-2xl p-6 text-center"
          style={{ border: `1px solid ${GREEN}30`, backgroundColor: `${GREEN}05` }}>
          <p className="text-[13px] font-bold mb-1.5" style={{ color: GREEN }}>
            Anamnesi completada
          </p>
          <p className="text-[11px] mb-5" style={{ color: DIM }}>
            {historial.filter(t => t.resposta).length} respostes capturades en {totalFasesCompletes} fases.
            Genera ara el diagnòstic empresarial complet.
          </p>
          <button onClick={handleGenerarDiagnostic} disabled={isGenerating || diagnosticGenerat}
            className="px-6 py-3 rounded-xl text-[12px] font-bold transition-all disabled:opacity-50 hover:opacity-80"
            style={{ backgroundColor: GREEN, color: "#FFFFFF" }}>
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">◌</span> Generant diagnòstic…
              </span>
            ) : diagnosticGenerat ? "Diagnòstic generat ✓" : "Generar Diagnòstic Empresarial"}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl p-3 mt-4" style={{ backgroundColor: "#DC262618", border: "1px solid #DC262630" }}>
          <p className="text-[11px]" style={{ color: "#DC2626" }}>{error}</p>
        </div>
      )}

      {/* Skip to diagnostic if has data */}
      {historial.filter(t => t.resposta).length >= 3 && !done && !fase5Complete && (
        <div className="mt-6 text-center">
          <button onClick={handleGenerarDiagnostic} disabled={isGenerating}
            className="text-[10px] hover:underline transition-opacity"
            style={{ color: LABEL }}>
            Saltar a generar diagnòstic amb les dades actuals
          </button>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
