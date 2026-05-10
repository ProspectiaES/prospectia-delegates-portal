"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveAnamnesiAnswer, skipFaseOptionals, generateDiagnostic, resetAnamnesi } from "@/app/actions/bruixola";
import { ANAMNESI_PREGUNTES, FASE_INFO_PROMPTS } from "@/lib/bruixola-prompts";

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
const RED     = "#DC2626";

const FASE_COLORS: Record<number, string> = { 1: BLUE, 2: GOLD, 3: "#7C3AED", 4: RED, 5: GREEN };
const DRAFT_KEY = "anamnesi-draft-v2";

interface Props {
  respostesInicials: Record<number, string>;
}

export function AnamnesiClient({ respostesInicials }: Props) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [respostes, setRespostes] = useState<Record<number, string>>(respostesInicials);
  const [resposta, setResposta] = useState("");
  // deepeningFase: fase on l'usuari ha triat "Aprofundir" (efímer, es perd al recarregar — OK)
  const [deepeningFase, setDeepeningFase] = useState<number | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [copyOk, setCopyOk] = useState(false);
  const [isSaving, startSave] = useTransition();
  const [isSkipping, startSkip] = useTransition();
  const [isGenerating, startGenerate] = useTransition();
  const [isResetting, startReset] = useTransition();

  // Fase on totes les core estan contestades però cap opcional ha estat tocada
  // (ni contestada ni saltada) → mostrar panell de decisió
  const pendingDecisionFase: number | null = (() => {
    for (let f = 1; f <= 5; f++) {
      if (deepeningFase === f) continue; // l'usuari ja va triar aprofundir aquesta fase
      const core = ANAMNESI_PREGUNTES.filter(q => q.fase === f && q.core);
      const opts = ANAMNESI_PREGUNTES.filter(q => q.fase === f && !q.core);
      const allCoreAnswered = core.every(q => !!respostes[q.ordre]);
      const anyOptTouched   = opts.some(q => !!respostes[q.ordre]); // contestada o __skip__
      if (allCoreAnswered && !anyOptTouched) return f;
    }
    return null;
  })();

  // Pregunta actual: primera no contestada, saltant opcionals de fases no aprofundides
  const currentPregunta = (() => {
    if (pendingDecisionFase !== null) return null; // esperar decisió primer
    const skipFases = new Set<number>();
    for (const q of ANAMNESI_PREGUNTES) {
      if (respostes[q.ordre]) continue; // ja contestada o __skip__
      if (!q.core) {
        if (deepeningFase !== q.fase) {
          skipFases.add(q.fase); // saltar opcionals d'aquesta fase
          continue;
        }
      }
      if (skipFases.has(q.fase) && !q.core) continue;
      return q;
    }
    return null;
  })();

  const isComplete = pendingDecisionFase === null && currentPregunta === null;
  // Comptem respostes reals (excloem __skip__)
  const totalAnswered = Object.values(respostes).filter(v => v && v !== "__skip__").length;
  const totalCore = ANAMNESI_PREGUNTES.filter(p => p.core).length; // 15

  // Progress per phase
  function phaseProgress(fase: number) {
    const all = ANAMNESI_PREGUNTES.filter(p => p.fase === fase);
    const core = all.filter(p => p.core);
    const answered = all.filter(p => respostes[p.ordre]);
    const coreAnswered = core.filter(p => respostes[p.ordre]);
    return { total: all.length, core: core.length, answered: answered.length, coreAnswered: coreAnswered.length };
  }

  // Restore draft
  useEffect(() => {
    if (!currentPregunta) return;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const { ordre, t } = JSON.parse(saved) as { ordre: number; t: string };
        if (ordre === currentPregunta.ordre) setResposta(t);
        else setResposta("");
      }
    } catch { setResposta(""); }
  }, [currentPregunta?.ordre]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [currentPregunta?.ordre]);
  useEffect(() => { if (textareaRef.current && currentPregunta) textareaRef.current.focus(); }, [currentPregunta?.ordre]);

  function handleRespostaChange(v: string) {
    setResposta(v);
    if (currentPregunta) {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ordre: currentPregunta.ordre, t: v })); } catch { /* ignore */ }
    }
  }

  function handleEnviar() {
    if (!resposta.trim() || !currentPregunta || isSaving) return;
    const text = resposta.trim();
    const ordre = currentPregunta.ordre;
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setResposta("");
    setRespostes(prev => ({ ...prev, [ordre]: text }));
    // Si acabem les opcionals d'una fase, sortim del mode aprofundir
    if (!currentPregunta.core && currentPregunta.ordreFase === 5) setDeepeningFase(null);
    startSave(async () => { await saveAnamnesiAnswer(ordre, text); });
  }

  function handleReset() {
    if (!confirm("Reiniciar l'anamnesi? Es perdran totes les respostes.")) return;
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    startReset(async () => {
      await resetAnamnesi();
      setRespostes({});
      setResposta("");
      setDeepeningFase(null);
    });
  }

  function handleCopyAll() {
    const lines = ANAMNESI_PREGUNTES
      .filter(q => respostes[q.ordre])
      .map(q => `[F${q.fase} · ${FASE_INFO_PROMPTS[q.fase]?.label}] P${q.ordreFase}\n${q.text}\n\n${respostes[q.ordre]}`)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(lines).then(() => { setCopyOk(true); setTimeout(() => setCopyOk(false), 2000); });
  }

  const faseActual = currentPregunta?.fase ?? pendingDecisionFase ?? (isComplete ? 6 : 1);
  const faseColor = FASE_COLORS[faseActual] ?? GOLD;

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-10">

      {/* Nav */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/dashboard/bruixola"
          className="text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-70"
          style={{ color: LABEL }}>
          ← Brúixola
        </Link>
        <div className="flex items-center gap-3">
          {totalAnswered > 0 && (
            <button onClick={() => setShowExport(!showExport)}
              className="text-[10px] font-semibold px-3 py-1.5 rounded-lg hover:opacity-70"
              style={{ color: BLUE, border: `1px solid ${BLUE}30`, backgroundColor: `${BLUE}06` }}>
              {showExport ? "Tancar" : "Veure respostes"}
            </button>
          )}
          {totalAnswered > 0 && (
            <button onClick={handleReset} disabled={isResetting}
              className="text-[10px] hover:opacity-70" style={{ color: LABEL }}>
              {isResetting ? "Reiniciant…" : "Reiniciar"}
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="mb-6">
        <p className="text-[9px] font-bold uppercase tracking-[0.35em] mb-2" style={{ color: LABEL }}>
          Anamnesi Estratègica
        </p>
        <h1 className="text-[26px] font-black leading-tight tracking-tight mb-1" style={{ color: TEXT }}>
          Entendre l&apos;empresa
        </h1>
        <p className="text-[11px]" style={{ color: DIM }}>
          {totalCore} preguntes essencials en 5 fases · {totalAnswered}/{totalCore} respostes completades
        </p>
      </div>

      {/* Phase progress tabs */}
      <div className="grid grid-cols-5 gap-1.5 mb-8">
        {[1,2,3,4,5].map(f => {
          const prog = phaseProgress(f);
          const isActive = f === faseActual && !isComplete;
          const isDone = prog.coreAnswered >= prog.core;
          const c = FASE_COLORS[f];
          return (
            <div key={f} className="rounded-xl p-2.5"
              style={{ backgroundColor: isActive ? `${c}10` : isDone ? `${c}06` : SURFACE, border: `1px solid ${isActive ? c : isDone ? `${c}40` : BORDER}` }}>
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[9px] font-black" style={{ color: isDone ? c : isActive ? c : LABEL }}>F{f}</span>
                {isDone && <span className="text-[9px]" style={{ color: c }}>✓</span>}
              </div>
              <p className="text-[7px] font-semibold leading-tight hidden md:block" style={{ color: isActive ? c : LABEL }}>
                {FASE_INFO_PROMPTS[f]?.label}
              </p>
              <div className="mt-1.5 h-0.5 rounded-full" style={{ backgroundColor: BORDER }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${prog.core > 0 ? (prog.coreAnswered / prog.core) * 100 : 0}%`, backgroundColor: c }} />
              </div>
              <p className="text-[7px] mt-0.5 tabular-nums" style={{ color: LABEL }}>
                {prog.coreAnswered}/{prog.core}
              </p>
            </div>
          );
        })}
      </div>

      {/* Export panel */}
      {showExport && totalAnswered > 0 && (
        <div className="rounded-2xl overflow-hidden mb-6" style={{ border: `1px solid ${BORDER}`, backgroundColor: CARD }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: LABEL }}>
              {totalAnswered} respostes guardades
            </p>
            <button onClick={handleCopyAll}
              className="text-[9px] font-bold px-3 py-1 rounded-lg hover:opacity-80"
              style={{ backgroundColor: copyOk ? GREEN : GOLD, color: "#FFFFFF" }}>
              {copyOk ? "✓ Copiat!" : "Copiar tot"}
            </button>
          </div>
          <div className="p-4 space-y-4 max-h-[50vh] overflow-y-auto">
            {[1,2,3,4,5].map(f => {
              const faseQs = ANAMNESI_PREGUNTES.filter(q => q.fase === f && respostes[q.ordre]);
              if (faseQs.length === 0) return null;
              const fc = FASE_COLORS[f];
              return (
                <div key={f}>
                  <p className="text-[8px] font-bold uppercase tracking-wider mb-2" style={{ color: fc }}>
                    F{f} · {FASE_INFO_PROMPTS[f]?.label}
                  </p>
                  <div className="space-y-2">
                    {faseQs.map(q => (
                      <div key={q.ordre} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
                        <div className="px-3 py-1.5" style={{ backgroundColor: SURFACE }}>
                          <p className="text-[10px]" style={{ color: DIM }}>{q.text}</p>
                        </div>
                        <div className="px-3 py-2">
                          <p className="text-[11px] leading-relaxed whitespace-pre-line" style={{ color: TEXT }}>{respostes[q.ordre]}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Decision point: offer deepen or advance */}
      {pendingDecisionFase && (
        <div className="rounded-2xl p-6 mb-6"
          style={{ border: `1px solid ${FASE_COLORS[pendingDecisionFase]}30`, backgroundColor: `${FASE_COLORS[pendingDecisionFase]}05` }}>
          <p className="text-[13px] font-bold mb-1" style={{ color: TEXT }}>
            F{pendingDecisionFase} · {FASE_INFO_PROMPTS[pendingDecisionFase]?.label} — nucli completat ✓
          </p>
          <p className="text-[11px] mb-5" style={{ color: DIM }}>
            Has respost les 3 preguntes essencials. Pots continuar a la fase següent o aprofundir amb 2 preguntes addicionals.
          </p>
          <div className="flex gap-3 flex-wrap">
            <button
              disabled={isSkipping}
              onClick={() => {
                const skipEntries = Object.fromEntries(
                  ANAMNESI_PREGUNTES.filter(q => q.fase === pendingDecisionFase && !q.core).map(q => [q.ordre, "__skip__"])
                );
                setRespostes(prev => ({ ...prev, ...skipEntries }));
                startSkip(async () => { await skipFaseOptionals(pendingDecisionFase); });
              }}
              className="px-5 py-2.5 rounded-xl text-[11px] font-bold hover:opacity-80 transition-all disabled:opacity-40"
              style={{ backgroundColor: FASE_COLORS[Math.min(pendingDecisionFase + 1, 5)] ?? GOLD, color: "#FFFFFF" }}>
              {isSkipping ? "Guardant…" : pendingDecisionFase < 5 ? `Continuar a F${pendingDecisionFase + 1} →` : "Completar anamnesi →"}
            </button>
            <button onClick={() => setDeepeningFase(pendingDecisionFase)}
              className="px-5 py-2.5 rounded-xl text-[11px] font-semibold hover:opacity-80 transition-all"
              style={{ border: `1px solid ${FASE_COLORS[pendingDecisionFase]}50`, color: FASE_COLORS[pendingDecisionFase], backgroundColor: CARD }}>
              Aprofundir F{pendingDecisionFase} (2 preguntes més)
            </button>
          </div>
        </div>
      )}

      {/* Active question */}
      {currentPregunta && !pendingDecisionFase && (
        <div className="rounded-2xl overflow-hidden mb-4"
          style={{ border: `1px solid ${faseColor}30`, backgroundColor: CARD }}>
          {/* Phase header */}
          <div className="px-5 py-3 flex items-center justify-between"
            style={{ backgroundColor: `${faseColor}08`, borderBottom: `1px solid ${faseColor}20` }}>
            <div className="flex items-center gap-2.5">
              <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: faseColor }} />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: faseColor }}>
                  F{currentPregunta.fase} · {FASE_INFO_PROMPTS[currentPregunta.fase]?.label}
                </p>
                <p className="text-[8px]" style={{ color: LABEL }}>
                  {currentPregunta.core
                    ? `Pregunta essencial ${currentPregunta.ordreFase}/3`
                    : `Aprofundiment ${currentPregunta.ordreFase - 3}/2`}
                  {!currentPregunta.core && (
                    <span className="ml-1 px-1 rounded text-[7px]"
                      style={{ backgroundColor: `${GOLD}15`, color: GOLD }}>opcional</span>
                  )}
                </p>
              </div>
            </div>
            <span className="text-[9px] tabular-nums font-semibold" style={{ color: LABEL }}>
              {totalAnswered}/{totalCore} core
            </span>
          </div>

          <div className="p-6">
            {currentPregunta.subtitol && (
              <p className="text-[10px] italic mb-3" style={{ color: LABEL }}>{currentPregunta.subtitol}</p>
            )}
            <p className="text-[15px] font-semibold leading-relaxed mb-5" style={{ color: TEXT }}>
              {currentPregunta.text}
            </p>
            <textarea
              ref={textareaRef}
              value={resposta}
              onChange={e => handleRespostaChange(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleEnviar(); }}
              placeholder="Respon amb honestedat i concreció…"
              rows={4}
              className="w-full rounded-xl outline-none resize-none text-[13px] leading-relaxed p-4"
              style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER2}`, color: TEXT }}
              onFocus={e => (e.target.style.borderColor = faseColor)}
              onBlur={e => (e.target.style.borderColor = BORDER2)}
            />
            <div className="flex items-center justify-between mt-3">
              <p className="text-[9px]" style={{ color: LABEL }}>
                {resposta.trim() ? "✓ Esborrany guardat · " : ""}⌘↵ per enviar
              </p>
              <button
                onClick={handleEnviar}
                disabled={!resposta.trim() || isSaving}
                className="px-5 py-2 rounded-lg text-[11px] font-bold transition-all disabled:opacity-30 hover:opacity-80"
                style={{ backgroundColor: faseColor, color: "#FFFFFF" }}>
                {isSaving ? "Guardant…" : "Continuar →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Answered history (collapsed by default, visible via "Veure respostes") */}
      {!showExport && totalAnswered > 0 && (
        <div className="space-y-2 mb-6">
          {ANAMNESI_PREGUNTES.filter(q => respostes[q.ordre] && respostes[q.ordre] !== "__skip__").slice(-3).map(q => {
            const fc = FASE_COLORS[q.fase];
            return (
              <div key={q.ordre} className="rounded-xl overflow-hidden opacity-60"
                style={{ border: `1px solid ${BORDER}` }}>
                <div className="px-3 py-1.5 flex items-center gap-2" style={{ backgroundColor: SURFACE }}>
                  <span className="text-[7px] font-bold uppercase" style={{ color: fc }}>F{q.fase}·P{q.ordreFase}</span>
                  <p className="text-[9px] line-clamp-1 flex-1" style={{ color: LABEL }}>{q.text}</p>
                </div>
                <div className="px-3 py-2">
                  <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: DIM }}>{respostes[q.ordre]}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Complete */}
      {isComplete && (
        <div className="rounded-2xl p-6 text-center"
          style={{ border: `1px solid ${GREEN}30`, backgroundColor: `${GREEN}05` }}>
          <p className="text-[13px] font-bold mb-1.5" style={{ color: GREEN }}>
            Anamnesi completada ✓
          </p>
          <p className="text-[11px] mb-5" style={{ color: DIM }}>
            {totalAnswered} respostes en 5 fases. Genera ara el diagnòstic empresarial.
          </p>
          <button onClick={() => startGenerate(async () => { await generateDiagnostic(); router.push("/dashboard/bruixola/diagnostic"); })}
            disabled={isGenerating}
            className="px-6 py-3 rounded-xl text-[12px] font-bold disabled:opacity-50 hover:opacity-80 transition-all"
            style={{ backgroundColor: GREEN, color: "#FFFFFF" }}>
            {isGenerating ? <span className="flex items-center gap-2"><span className="animate-spin">◌</span>Generant diagnòstic…</span> : "Generar Diagnòstic Empresarial →"}
          </button>
          <div className="mt-4">
            <button onClick={() => startGenerate(async () => { await generateDiagnostic(); router.push("/dashboard/bruixola/diagnostic"); })}
              disabled={isGenerating} className="text-[10px] hover:underline" style={{ color: LABEL }}>
              Saltar a diagnòstic amb les dades actuals
            </button>
          </div>
        </div>
      )}

      {/* Early diagnostic option */}
      {!isComplete && totalAnswered >= 9 && (
        <div className="mt-4 text-center">
          <button onClick={() => startGenerate(async () => { await generateDiagnostic(); router.push("/dashboard/bruixola/diagnostic"); })}
            disabled={isGenerating} className="text-[10px] hover:underline transition-opacity" style={{ color: LABEL }}>
            Generar diagnòstic amb les {totalAnswered} respostes actuals (sense completar)
          </button>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
