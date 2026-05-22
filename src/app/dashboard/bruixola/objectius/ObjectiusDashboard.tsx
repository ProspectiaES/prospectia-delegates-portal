"use client";

import { useState, useTransition, useActionState } from "react";
import Link from "next/link";
import { createObjectiu, quickUpdateProgress } from "@/app/actions/bruixola-objectius";

type ObjMin = {
  id: string; titol: string; tipus: string; any: number;
  trimestre: number | null; mes: number | null; estat: string;
  prioritat: number | null; progress: number; data_objectiu: string | null;
  metrica: string | null; valor_objectiu: number | null; valor_actual: number | null;
  seguent_accio: string | null; decisio_pendent: string | null;
};

const ESTAT_CFG: Record<string, { bg: string; text: string; label: string }> = {
  actiu:     { bg: "#DBEAFE", text: "#1D4ED8", label: "Actiu" },
  assolit:   { bg: "#D1FAE5", text: "#065F46", label: "Assolit" },
  bloquejat: { bg: "#FEE2E2", text: "#991B1B", label: "Bloquejat" },
  desviat:   { bg: "#FEF3C7", text: "#92400E", label: "Desviat" },
  cancelat:  { bg: "#F3F4F6", text: "#6B7280", label: "Cancel·lat" },
  pendent:   { bg: "#F3F4F6", text: "#374151", label: "Pendent" },
};

const MESOS = ["Gen","Feb","Mar","Abr","Mai","Jun","Jul","Ago","Set","Oct","Nov","Des"];

function periodLabel(o: ObjMin) {
  if (o.tipus === "trimestral" && o.trimestre) return `Q${o.trimestre} ${o.any}`;
  if (o.tipus === "mensual" && o.mes) return `${MESOS[o.mes - 1]} ${o.any}`;
  return String(o.any);
}

function ProgressBar({ value, estat }: { value: number; estat: string }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = estat === "assolit" ? "#059669" : estat === "bloquejat" ? "#DC2626" : estat === "desviat" ? "#D97706" : "#8E0E1A";
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <div className="flex-1 h-1 bg-[#F3F4F6] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[9px] font-bold tabular-nums" style={{ color, minWidth: 24, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

function QuickRow({ o, onDone }: { o: ObjMin; onDone: () => void }) {
  const [progress, setProgress] = useState(o.progress);
  const [estat, setEstat] = useState(o.estat);
  const [pending, start] = useTransition();
  function save() {
    start(async () => { await quickUpdateProgress(o.id, progress, estat); onDone(); });
  }
  return (
    <div className="flex items-center gap-2 flex-wrap mt-2 pt-2 border-t border-[#F3F4F6]">
      <input type="range" min={0} max={100} step={5} value={progress}
        onChange={e => setProgress(Number(e.target.value))}
        className="w-24 accent-[#8E0E1A]" />
      <span className="text-[10px] font-bold w-6">{progress}%</span>
      <select value={estat} onChange={e => setEstat(e.target.value)}
        className="text-[10px] border border-[#E5E7EB] rounded px-1.5 py-0.5 bg-white">
        {Object.entries(ESTAT_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      <button onClick={save} disabled={pending}
        className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#8E0E1A] text-white disabled:opacity-50">
        {pending ? "…" : "OK"}
      </button>
      <button onClick={onDone} className="text-[10px] text-[#9CA3AF]">✕</button>
    </div>
  );
}

function QuickNewForm({ onDone, currentYear }: { onDone: () => void; currentYear: number }) {
  const [state, formAction, pending] = useActionState(createObjectiu, null);
  if (state?.success) { onDone(); return null; }
  return (
    <form action={formAction} className="space-y-2 mt-3 pt-3 border-t border-[#F3F4F6]">
      <input name="titol" required autoFocus placeholder="Títol de l'objectiu…"
        className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]" />
      <input type="hidden" name="any" value={currentYear} />
      <div className="flex gap-2">
        <select name="tipus" defaultValue="anual"
          className="flex-1 border border-[#E5E7EB] rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20">
          <option value="anual">Anual</option>
          <option value="trimestral">Trimestral</option>
          <option value="mensual">Mensual</option>
        </select>
        <select name="estat" defaultValue="actiu"
          className="flex-1 border border-[#E5E7EB] rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20">
          {Object.entries(ESTAT_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select name="prioritat" defaultValue="3"
          className="flex-1 border border-[#E5E7EB] rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20">
          <option value="1">P1 – Crítica</option>
          <option value="2">P2 – Alta</option>
          <option value="3">P3 – Mitjana</option>
          <option value="4">P4 – Baixa</option>
        </select>
      </div>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending}
          className="flex-1 py-1.5 rounded-lg bg-[#8E0E1A] text-white text-xs font-semibold disabled:opacity-50 hover:bg-[#7A0B16] transition-colors">
          {pending ? "Guardant…" : "Crear objectiu"}
        </button>
        <button type="button" onClick={onDone}
          className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-xs text-[#6B7280] hover:bg-[#F9FAFB]">
          Cancel·lar
        </button>
      </div>
    </form>
  );
}

export function ObjectiusDashboard({
  objectius, currentYear,
}: { objectius: ObjMin[]; currentYear: number; userId: string }) {
  const [showNew, setShowNew] = useState(false);
  const [quickEditId, setQuickEditId] = useState<string | null>(null);

  const thisYear = objectius.filter(o => o.any === currentYear);
  const active   = thisYear.filter(o => !["cancelat","assolit"].includes(o.estat));
  const assolits = thisYear.filter(o => o.estat === "assolit").length;
  const bloquejats = thisYear.filter(o => o.estat === "bloquejat").length;

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <p className="text-sm font-bold text-[#0A0A0A]">Objectius {currentYear}</p>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#DBEAFE] text-[#1D4ED8]">{active.length} actius</span>
            {assolits > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#D1FAE5] text-[#065F46]">{assolits} assolits</span>}
            {bloquejats > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#FEE2E2] text-[#991B1B]">{bloquejats} bloquejats</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNew(v => !v)}
            className="h-7 px-3 rounded-lg bg-[#8E0E1A] text-white text-[11px] font-semibold hover:bg-[#7A0B16] transition-colors">
            + Nou
          </button>
          <Link href="/dashboard/bruixola/objectius"
            className="h-7 px-3 rounded-lg border border-[#E5E7EB] text-[11px] font-medium text-[#6B7280] hover:bg-[#F9FAFB] transition-colors flex items-center">
            Veure tots →
          </Link>
        </div>
      </div>

      {thisYear.length === 0 && !showNew ? (
        <div className="text-center py-4">
          <p className="text-xs text-[#9CA3AF]">Cap objectiu per {currentYear}.</p>
          <button onClick={() => setShowNew(true)} className="mt-1 text-xs font-semibold text-[#8E0E1A] hover:underline">
            + Crear primer objectiu
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {thisYear.slice(0, 6).map(o => {
            const c = ESTAT_CFG[o.estat] ?? ESTAT_CFG.actiu;
            const isEditing = quickEditId === o.id;
            return (
              <div key={o.id} className="rounded-lg border border-[#F3F4F6] px-3 py-2 hover:border-[#E5E7EB] transition-colors">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {o.prioritat && o.prioritat <= 2 && (
                        <svg width="9" height="9" viewBox="0 0 16 16" fill="#8E0E1A" className="shrink-0 mt-0.5" aria-hidden>
                          <path d="M8 1l2.2 4.5L15 6.4l-3.5 3.4.8 4.8L8 12.5l-4.3 2.2.8-4.8L1 6.4l4.8-.9z"/>
                        </svg>
                      )}
                      <span className="text-xs font-semibold text-[#0A0A0A] truncate">{o.titol}</span>
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ backgroundColor: c.bg, color: c.text }}>{c.label}</span>
                      <span className="text-[9px] text-[#9CA3AF] shrink-0">{periodLabel(o)}</span>
                    </div>
                    <ProgressBar value={o.progress} estat={o.estat} />
                    {o.seguent_accio && !isEditing && (
                      <p className="text-[10px] text-[#6B7280] mt-1 truncate">↪ {o.seguent_accio}</p>
                    )}
                  </div>
                  <button onClick={() => setQuickEditId(isEditing ? null : o.id)}
                    className="shrink-0 text-[10px] text-[#9CA3AF] hover:text-[#374151] border border-[#F3F4F6] rounded px-1.5 py-0.5 hover:border-[#E5E7EB] transition-colors">
                    {isEditing ? "✕" : "↻"}
                  </button>
                </div>
                {isEditing && <QuickRow o={o} onDone={() => setQuickEditId(null)} />}
              </div>
            );
          })}
          {thisYear.length > 6 && (
            <Link href="/dashboard/bruixola/objectius"
              className="block text-center text-xs text-[#6B7280] hover:text-[#111827] py-1">
              + {thisYear.length - 6} objectius més →
            </Link>
          )}
        </div>
      )}

      {showNew && <QuickNewForm onDone={() => setShowNew(false)} currentYear={currentYear} />}
    </div>
  );
}
