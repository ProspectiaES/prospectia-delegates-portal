"use client";

import { useState, useTransition, useActionState } from "react";
import { createObjectiu, updateObjectiu, deleteObjectiu, quickUpdateProgress, addObjectiuEntry } from "@/app/actions/bruixola-objectius";
import type { Objectiu } from "./page";

export const ESTAT_CFG: Record<string, { bg: string; text: string; label: string }> = {
  actiu:     { bg: "#DBEAFE", text: "#1D4ED8", label: "Actiu" },
  assolit:   { bg: "#D1FAE5", text: "#065F46", label: "Assolit" },
  bloquejat: { bg: "#FEE2E2", text: "#991B1B", label: "Bloquejat" },
  desviat:   { bg: "#FEF3C7", text: "#92400E", label: "Desviat" },
  cancelat:  { bg: "#F3F4F6", text: "#6B7280", label: "Cancel·lat" },
  pendent:   { bg: "#F3F4F6", text: "#374151", label: "Pendent" },
};

const TIPUS_LABELS: Record<string, string> = {
  anual: "Anual", trimestral: "Trimestral", mensual: "Mensual",
};

const TRIMESTRES = ["Q1","Q2","Q3","Q4"];
export const MESOS = ["Gen","Feb","Mar","Abr","Mai","Jun","Jul","Ago","Set","Oct","Nov","Des"];

export function periodLabel(o: Objectiu) {
  if (o.tipus === "trimestral" && o.trimestre) return `${o.any} · Q${o.trimestre}`;
  if (o.tipus === "mensual" && o.mes) return `${o.any} · ${MESOS[o.mes - 1]}`;
  return String(o.any);
}

export function EstatBadge({ estat }: { estat: string }) {
  const c = ESTAT_CFG[estat] ?? ESTAT_CFG.actiu;
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ backgroundColor: c.bg, color: c.text }}>
      {c.label}
    </span>
  );
}

export function ProgressBar({ value, estat }: { value: number; estat?: string }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = estat === "assolit" ? "#059669" : estat === "bloquejat" ? "#DC2626" : estat === "desviat" ? "#D97706" : "#8E0E1A";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-bold tabular-nums w-7 text-right" style={{ color }}>{pct}%</span>
    </div>
  );
}

// ─── Parse notes as tracking entries ─────────────────────────────────────────
// Format: [2026-05-22] val:1231 Nota de seguiment
type TrackEntry = { date: string; val: number | null; nota: string };

export function parseNotes(notes: string | null): TrackEntry[] {
  if (!notes) return [];
  return notes.split("\n").filter(Boolean).map(line => {
    const dateM = line.match(/^\[(\d{4}-\d{2}-\d{2})\]/);
    const valM  = line.match(/val:([\d.]+)/);
    const nota  = line.replace(/^\[\d{4}-\d{2}-\d{2}\]\s*/, "").replace(/val:[\d.]+\s*/, "").trim();
    return {
      date: dateM?.[1] ?? "",
      val:  valM ? parseFloat(valM[1]) : null,
      nota,
    };
  }).filter(e => e.date).reverse();
}

// ─── Seguiment panel ─────────────────────────────────────────────────────────

function SeguimentPanel({ o, realData }: { o: Objectiu; realData?: { label: string; value: number; unit?: string }[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [nota, setNota] = useState("");
  const [valor, setValor] = useState("");
  const [pending, start] = useTransition();

  const entries = parseNotes(o.notes);
  const today = new Date().toISOString().slice(0, 10);

  function addEntry() {
    if (!nota.trim()) return;
    start(async () => {
      await addObjectiuEntry(o.id, {
        data: today,
        nota: nota.trim(),
        valor: valor ? parseFloat(valor) : null,
      });
      setNota("");
      setValor("");
      setShowAdd(false);
    });
  }

  return (
    <div className="mt-3 pt-3 border-t border-[#F3F4F6] space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Seguiment</p>
        <button onClick={() => setShowAdd(v => !v)}
          className="text-[10px] font-medium text-[#8E0E1A] hover:underline">
          {showAdd ? "Cancel·lar" : "+ Afegir entrada"}
        </button>
      </div>

      {/* Real data from system */}
      {realData && realData.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {realData.map(d => (
            <div key={d.label} className="bg-[#F9FAFB] rounded-lg px-3 py-2">
              <p className="text-[9px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{d.label}</p>
              <p className="text-sm font-bold text-[#0A0A0A] mt-0.5">
                {d.unit === "€"
                  ? new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(d.value)
                  : d.value.toLocaleString("es-ES")}{d.unit && d.unit !== "€" ? ` ${d.unit}` : ""}
              </p>
              {o.valor_objectiu != null && (
                <p className="text-[9px] text-[#9CA3AF] mt-0.5">
                  {Math.round((d.value / o.valor_objectiu) * 100)}% de l&apos;objectiu
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add entry form */}
      {showAdd && (
        <div className="bg-[#F9FAFB] rounded-lg p-3 space-y-2">
          <div className="flex gap-2">
            <input value={nota} onChange={e => setNota(e.target.value)}
              placeholder="Nota de seguiment…"
              className="flex-1 border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A] bg-white" />
            <input value={valor} onChange={e => setValor(e.target.value)}
              type="number" step="any" placeholder="Valor"
              className="w-24 border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A] bg-white" />
            <button onClick={addEntry} disabled={pending || !nota.trim()}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#8E0E1A] text-white disabled:opacity-50 hover:bg-[#7A0B16] transition-colors">
              {pending ? "…" : "OK"}
            </button>
          </div>
        </div>
      )}

      {/* Entry log */}
      {entries.length > 0 ? (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {entries.map((e, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px]">
              <span className="text-[#9CA3AF] tabular-nums shrink-0 pt-0.5">{e.date}</span>
              {e.val != null && (
                <span className="font-semibold text-[#374151] shrink-0">
                  {e.val.toLocaleString("es-ES")}
                </span>
              )}
              <span className="text-[#374151]">{e.nota}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-[#9CA3AF]">Sense entrades de seguiment.</p>
      )}
    </div>
  );
}

// ─── Inline Quick-Edit Row ────────────────────────────────────────────────────

function QuickEditRow({ o, onDone }: { o: Objectiu; onDone: () => void }) {
  const [progress, setProgress] = useState(o.progress);
  const [estat, setEstat] = useState(o.estat);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      await quickUpdateProgress(o.id, progress, estat);
      onDone();
    });
  }

  return (
    <div className="flex items-center gap-3 flex-wrap py-1">
      <div className="flex items-center gap-2">
        <label className="text-[10px] text-[#6B7280] uppercase tracking-wider">Progrés</label>
        <input type="range" min={0} max={100} step={5} value={progress}
          onChange={e => setProgress(Number(e.target.value))}
          className="w-28 accent-[#8E0E1A]" />
        <span className="text-xs font-bold w-8 tabular-nums">{progress}%</span>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-[10px] text-[#6B7280] uppercase tracking-wider">Estat</label>
        <select value={estat} onChange={e => setEstat(e.target.value)}
          className="text-xs border border-[#E5E7EB] rounded-lg px-2 py-1 bg-white">
          {Object.entries(ESTAT_CFG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>
      <button onClick={save} disabled={pending}
        className="text-xs font-semibold px-3 py-1 rounded-lg bg-[#8E0E1A] text-white hover:bg-[#7A0B16] disabled:opacity-50 transition-colors">
        {pending ? "Guardant…" : "Guardar"}
      </button>
      <button onClick={onDone} className="text-xs text-[#6B7280] hover:text-[#111827] px-2 py-1">
        Cancel·lar
      </button>
    </div>
  );
}

// ─── Objectiu Card ────────────────────────────────────────────────────────────

export function ObjectiuCard({
  o, onEdit, onDelete, showSeguiment = true,
  realData,
}: {
  o: Objectiu;
  onEdit: (o: Objectiu) => void;
  onDelete: (id: string) => void;
  showSeguiment?: boolean;
  realData?: { label: string; value: number; unit?: string }[];
}) {
  const [quickEdit, setQuickEdit] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [delPending, startDel] = useTransition();

  function doDelete() {
    startDel(async () => { await deleteObjectiu(o.id); onDelete(o.id); });
  }

  const entries = parseNotes(o.notes);

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-2 hover:border-[#D1D5DB] transition-colors">
      <div className="flex items-start gap-2 justify-between">
        <div className="flex items-start gap-2 min-w-0">
          {o.prioritat && o.prioritat <= 2 && (
            <span className="mt-0.5 text-[#8E0E1A] shrink-0">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M8 1l2.2 4.5L15 6.4l-3.5 3.4.8 4.8L8 12.5l-4.3 2.2.8-4.8L1 6.4l4.8-.9z"/>
              </svg>
            </span>
          )}
          <p className="text-sm font-semibold text-[#0A0A0A] leading-snug">{o.titol}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          <EstatBadge estat={o.estat} />
          <button onClick={() => setQuickEdit(v => !v)}
            className="text-[10px] font-medium text-[#6B7280] hover:text-[#111827] border border-[#E5E7EB] rounded-lg px-2 py-0.5 hover:bg-[#F9FAFB] transition-colors">
            {quickEdit ? "Tancar" : "Actualitzar"}
          </button>
          <button onClick={() => onEdit(o)}
            className="text-[10px] font-medium text-[#6B7280] hover:text-[#111827] border border-[#E5E7EB] rounded-lg px-2 py-0.5 hover:bg-[#F9FAFB] transition-colors">
            Editar
          </button>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="text-[10px] text-[#9CA3AF] hover:text-red-600 border border-transparent rounded-lg px-1 py-0.5 transition-colors">✕</button>
          ) : (
            <span className="flex items-center gap-1">
              <button onClick={doDelete} disabled={delPending}
                className="text-[10px] font-semibold text-red-600 hover:text-red-700 disabled:opacity-50">
                {delPending ? "…" : "Eliminar"}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-[10px] text-[#9CA3AF]">No</button>
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 text-[10px] text-[#9CA3AF]">
        <span className="font-medium text-[#6B7280]">{TIPUS_LABELS[o.tipus] ?? o.tipus}</span>
        <span>{periodLabel(o)}</span>
        {o.data_objectiu && (
          <span className="text-[#D97706]">⏱ {new Date(o.data_objectiu).toLocaleDateString("ca-ES", { day:"2-digit", month:"short", year:"numeric" })}</span>
        )}
        {o.metrica && <span className="truncate max-w-[200px]">{o.metrica}</span>}
        {entries.length > 0 && (
          <button onClick={() => setExpanded(v => !v)}
            className="text-[#8E0E1A] font-medium hover:underline">
            {entries.length} entrada{entries.length !== 1 ? "es" : ""} {expanded ? "▲" : "▼"}
          </button>
        )}
      </div>

      <ProgressBar value={o.progress} estat={o.estat} />

      {(o.valor_actual !== null || o.valor_objectiu !== null) && (
        <p className="text-[10px] text-[#6B7280]">
          {o.valor_actual !== null && <span>Actual: <strong className="text-[#111827]">{o.valor_actual.toLocaleString("es-ES")}</strong> </span>}
          {o.valor_objectiu !== null && <span>/ Objectiu: <strong className="text-[#111827]">{o.valor_objectiu.toLocaleString("es-ES")}</strong></span>}
        </p>
      )}

      {o.seguent_accio && (
        <p className="text-[11px] text-[#374151] bg-[#F9FAFB] rounded-lg px-2.5 py-1.5">
          <span className="text-[10px] font-semibold text-[#8E0E1A] uppercase tracking-wider mr-1">Seg. acció:</span>
          {o.seguent_accio}
        </p>
      )}

      {o.decisio_pendent && (
        <p className="text-[11px] text-[#92400E] bg-[#FEF3C7] rounded-lg px-2.5 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider mr-1">Decisió:</span>
          {o.decisio_pendent}
        </p>
      )}

      {quickEdit && <QuickEditRow o={o} onDone={() => setQuickEdit(false)} />}

      {showSeguiment && (expanded || quickEdit === false) && (
        <SeguimentPanel o={o} realData={expanded ? realData : undefined} />
      )}
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export function ObjectiuForm({
  initial, onClose, defaultDivisio,
}: { initial?: Objectiu; onClose: () => void; defaultDivisio?: string }) {
  const currentYear = new Date().getFullYear();
  const [tipus, setTipus] = useState(initial?.tipus ?? "anual");
  const action = initial ? updateObjectiu : createObjectiu;
  const [state, formAction, pending] = useActionState(action, null);

  if (state?.success) { onClose(); return null; }

  return (
    <form action={formAction} className="space-y-3">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="divisio" value={initial?.divisio ?? defaultDivisio ?? ""} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Títol *</label>
          <input name="titol" defaultValue={initial?.titol} required
            placeholder="Ex: Arribar a 50.000€ facturats al Q3"
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]" />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Tipus</label>
          <select name="tipus" defaultValue={initial?.tipus ?? "anual"} onChange={e => setTipus(e.target.value)}
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]">
            <option value="anual">Anual</option>
            <option value="trimestral">Trimestral</option>
            <option value="mensual">Mensual</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Any</label>
          <input name="any" type="number" defaultValue={initial?.any ?? currentYear} min={2020} max={2035}
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]" />
        </div>

        {tipus === "trimestral" && (
          <div>
            <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Trimestre</label>
            <select name="trimestre" defaultValue={initial?.trimestre ?? ""}
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20">
              <option value="">—</option>
              {TRIMESTRES.map((t, i) => <option key={t} value={i + 1}>{t}</option>)}
            </select>
          </div>
        )}

        {tipus === "mensual" && (
          <div>
            <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Mes</label>
            <select name="mes" defaultValue={initial?.mes ?? ""}
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20">
              <option value="">—</option>
              {MESOS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Estat</label>
          <select name="estat" defaultValue={initial?.estat ?? "actiu"}
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20">
            {Object.entries(ESTAT_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Prioritat</label>
          <select name="prioritat" defaultValue={initial?.prioritat ?? ""}
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20">
            <option value="">—</option>
            <option value="1">1 — Crítica</option>
            <option value="2">2 — Alta</option>
            <option value="3">3 — Mitjana</option>
            <option value="4">4 — Baixa</option>
            <option value="5">5 — Residual</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Progrés</label>
          <input name="progress" type="range" min={0} max={100} step={5}
            defaultValue={initial?.progress ?? 0}
            className="w-full accent-[#8E0E1A]" />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Data límit</label>
          <input name="data_objectiu" type="date" defaultValue={initial?.data_objectiu?.slice(0, 10) ?? ""}
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Mètrica (KPI)</label>
          <input name="metrica" defaultValue={initial?.metrica ?? ""}
            placeholder="Ex: Facturació mensual, Clients actius, NPS…"
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Valor actual</label>
          <input name="valor_actual" type="number" step="any" defaultValue={initial?.valor_actual ?? ""}
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Valor objectiu</label>
          <input name="valor_objectiu" type="number" step="any" defaultValue={initial?.valor_objectiu ?? ""}
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Següent acció</label>
          <input name="seguent_accio" defaultValue={initial?.seguent_accio ?? ""}
            placeholder="Que cal fer ara per avançar?"
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Decisió pendent</label>
          <input name="decisio_pendent" defaultValue={initial?.decisio_pendent ?? ""}
            placeholder="Decisió que cal prendre…"
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20" />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Descripció</label>
          <textarea name="descripcio" rows={2} defaultValue={initial?.descripcio ?? ""}
            placeholder="Detalls, context, com mesurem l'assoliment…"
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 resize-none" />
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={pending}
          className="flex-1 py-2 rounded-lg bg-[#8E0E1A] text-white text-sm font-semibold hover:bg-[#7A0B16] disabled:opacity-50 transition-colors">
          {pending ? "Guardant…" : initial ? "Actualitzar objectiu" : "Crear objectiu"}
        </button>
        <button type="button" onClick={onClose}
          className="px-4 py-2 rounded-lg border border-[#E5E7EB] text-sm text-[#6B7280] hover:bg-[#F9FAFB] transition-colors">
          Cancel·lar
        </button>
      </div>
    </form>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function ObjectiusClient({
  objectius, currentYear, defaultDivisio,
  getRealData,
}: {
  objectius: Objectiu[];
  currentYear: number;
  defaultDivisio?: string;
  getRealData?: (o: Objectiu) => { label: string; value: number; unit?: string }[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Objectiu | null>(null);
  const [filterYear, setFilterYear] = useState(currentYear);
  const [filterEstat, setFilterEstat] = useState<string>("all");

  const years = [...new Set(objectius.map(o => o.any))].sort((a, b) => b - a);
  if (!years.includes(currentYear)) years.unshift(currentYear);

  const filtered = objectius.filter(o => {
    if (o.any !== filterYear) return false;
    if (filterEstat !== "all" && o.estat !== filterEstat) return false;
    return true;
  });

  const total      = filtered.length;
  const assolits   = filtered.filter(o => o.estat === "assolit").length;
  const bloquejats = filtered.filter(o => o.estat === "bloquejat").length;
  const avgProgress = total > 0 ? Math.round(filtered.reduce((s, o) => s + o.progress, 0) / total) : 0;

  return (
    <div className="space-y-4">
      {total > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total", value: total, color: "#111827" },
            { label: "Assolits", value: assolits, color: "#059669" },
            { label: "Bloquejats", value: bloquejats, color: "#DC2626" },
            { label: "Progrés mig", value: `${avgProgress}%`, color: "#2563EB" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-[#E5E7EB] px-4 py-3">
              <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{s.label}</p>
              <p className="text-xl font-bold mt-0.5" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-[#F3F4F6] rounded-lg p-0.5">
          {years.map(y => (
            <button key={y} onClick={() => setFilterYear(y)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${filterYear === y ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#6B7280] hover:text-[#111827]"}`}>
              {y}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-[#F3F4F6] rounded-lg p-0.5">
          <button onClick={() => setFilterEstat("all")}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${filterEstat === "all" ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#6B7280] hover:text-[#111827]"}`}>
            Tots
          </button>
          {["actiu","assolit","bloquejat","desviat","pendent"].map(e => (
            <button key={e} onClick={() => setFilterEstat(e)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${filterEstat === e ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#6B7280] hover:text-[#111827]"}`}>
              {ESTAT_CFG[e]?.label ?? e}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <button onClick={() => { setEditTarget(null); setShowForm(v => !v); }}
          className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-[#8E0E1A] text-white text-xs font-semibold hover:bg-[#7A0B16] transition-colors">
          <span className="text-base leading-none">+</span> Nou objectiu
        </button>
      </div>

      {(showForm && !editTarget) && (
        <div className="bg-white rounded-xl border border-[#8E0E1A]/30 p-5">
          <p className="text-sm font-bold text-[#0A0A0A] mb-4">Nou objectiu</p>
          <ObjectiuForm onClose={() => setShowForm(false)} defaultDivisio={defaultDivisio} />
        </div>
      )}

      {editTarget && (
        <div className="bg-white rounded-xl border border-[#8E0E1A]/30 p-5">
          <p className="text-sm font-bold text-[#0A0A0A] mb-4">Editar objectiu</p>
          <ObjectiuForm initial={editTarget} onClose={() => setEditTarget(null)} defaultDivisio={defaultDivisio} />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
          <p className="text-sm text-[#9CA3AF]">Cap objectiu per {filterYear}{filterEstat !== "all" ? ` amb estat "${ESTAT_CFG[filterEstat]?.label}"` : ""}.</p>
          <button onClick={() => { setEditTarget(null); setShowForm(true); }}
            className="mt-3 text-sm font-semibold text-[#8E0E1A] hover:underline">
            + Crear primer objectiu
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(o => (
            <ObjectiuCard key={o.id} o={o}
              onEdit={obj => { setEditTarget(obj); setShowForm(false); }}
              onDelete={() => {}}
              realData={getRealData?.(o)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
