"use client";

import { useState, useTransition, useActionState } from "react";
import { createObjectiu, updateObjectiu, deleteObjectiu, quickUpdateProgress } from "@/app/actions/bruixola-objectius";
import type { Objectiu } from "./page";

const ESTAT_COLORS: Record<string, { bg: string; text: string; label: string }> = {
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
const MESOS = ["Gen","Feb","Mar","Abr","Mai","Jun","Jul","Ago","Set","Oct","Nov","Des"];

function periodLabel(o: Objectiu) {
  if (o.tipus === "trimestral" && o.trimestre) return `${o.any} · Q${o.trimestre}`;
  if (o.tipus === "mensual" && o.mes) return `${o.any} · ${MESOS[o.mes - 1]}`;
  return String(o.any);
}

function EstatBadge({ estat }: { estat: string }) {
  const c = ESTAT_COLORS[estat] ?? ESTAT_COLORS.actiu;
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ backgroundColor: c.bg, color: c.text }}>
      {c.label}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 100 ? "#059669" : pct >= 60 ? "#2563EB" : pct >= 30 ? "#D97706" : "#DC2626";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-bold tabular-nums w-7 text-right" style={{ color }}>{pct}%</span>
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
          {Object.entries(ESTAT_COLORS).map(([k, v]) => (
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

function ObjectiuCard({
  o, onEdit, onDelete,
}: { o: Objectiu; onEdit: (o: Objectiu) => void; onDelete: (id: string) => void }) {
  const [quickEdit, setQuickEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [delPending, startDel] = useTransition();

  function doDelete() {
    startDel(async () => { await deleteObjectiu(o.id); });
  }

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
        <div className="flex items-center gap-1.5 shrink-0">
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
              className="text-[10px] text-[#9CA3AF] hover:text-red-600 border border-transparent rounded-lg px-1 py-0.5 transition-colors">
              ✕
            </button>
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
        {o.metrica && <span className="truncate max-w-[180px]">{o.metrica}</span>}
      </div>

      <ProgressBar value={o.progress} />

      {o.metrica && (o.valor_actual !== null || o.valor_objectiu !== null) && (
        <p className="text-[10px] text-[#6B7280]">
          {o.valor_actual !== null && <span>Actual: <strong className="text-[#111827]">{o.valor_actual}</strong> </span>}
          {o.valor_objectiu !== null && <span>/ Objectiu: <strong className="text-[#111827]">{o.valor_objectiu}</strong></span>}
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
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

function ObjectiuForm({
  initial, onClose,
}: { initial?: Objectiu; onClose: () => void }) {
  const currentYear = new Date().getFullYear();
  const [tipus, setTipus] = useState(initial?.tipus ?? "anual");
  const action = initial ? updateObjectiu : createObjectiu;
  const [state, formAction, pending] = useActionState(action, null);

  if (state?.success) {
    onClose();
    return null;
  }

  return (
    <form action={formAction} className="space-y-3">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Títol *</label>
          <input name="titol" defaultValue={initial?.titol} required
            placeholder="Ex: Arribar a 500 delegats actius al Q3"
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
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]">
              <option value="">—</option>
              {TRIMESTRES.map((t, i) => <option key={t} value={i + 1}>{t}</option>)}
            </select>
          </div>
        )}

        {tipus === "mensual" && (
          <div>
            <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Mes</label>
            <select name="mes" defaultValue={initial?.mes ?? ""}
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]">
              <option value="">—</option>
              {MESOS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Estat</label>
          <select name="estat" defaultValue={initial?.estat ?? "actiu"}
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]">
            {Object.entries(ESTAT_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Prioritat</label>
          <select name="prioritat" defaultValue={initial?.prioritat ?? ""}
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]">
            <option value="">—</option>
            <option value="1">1 — Crítica</option>
            <option value="2">2 — Alta</option>
            <option value="3">3 — Mitjana</option>
            <option value="4">4 — Baixa</option>
            <option value="5">5 — Residual</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">
            Progrés: <span className="text-[#8E0E1A] font-bold">{initial?.progress ?? 0}%</span>
          </label>
          <input name="progress" type="range" min={0} max={100} step={5}
            defaultValue={initial?.progress ?? 0}
            className="w-full accent-[#8E0E1A]" />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Data límit</label>
          <input name="data_objectiu" type="date" defaultValue={initial?.data_objectiu?.slice(0, 10) ?? ""}
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]" />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Mètrica (KPI)</label>
          <input name="metrica" defaultValue={initial?.metrica ?? ""}
            placeholder="Ex: Facturació mensual, NPS, Delegats actius…"
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]" />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Valor actual</label>
          <input name="valor_actual" type="number" step="any" defaultValue={initial?.valor_actual ?? ""}
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]" />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Valor objectiu</label>
          <input name="valor_objectiu" type="number" step="any" defaultValue={initial?.valor_objectiu ?? ""}
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]" />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Següent acció</label>
          <input name="seguent_accio" defaultValue={initial?.seguent_accio ?? ""}
            placeholder="Que cal fer ara per avançar?"
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]" />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Decisió pending</label>
          <input name="decisio_pendent" defaultValue={initial?.decisio_pendent ?? ""}
            placeholder="Decisió que cal prendre…"
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A]" />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Descripció</label>
          <textarea name="descripcio" rows={2} defaultValue={initial?.descripcio ?? ""}
            placeholder="Detalls, context, com mesurem l'assoliment…"
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/20 focus:border-[#8E0E1A] resize-none" />
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

export function ObjectiusClient({ objectius, currentYear }: { objectius: Objectiu[]; currentYear: number }) {
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

  // Stats for current filter
  const total     = filtered.length;
  const assolits  = filtered.filter(o => o.estat === "assolit").length;
  const bloquejats = filtered.filter(o => o.estat === "bloquejat").length;
  const avgProgress = total > 0 ? Math.round(filtered.reduce((s, o) => s + o.progress, 0) / total) : 0;

  function handleDelete(id: string) {
    // optimistic removal would need state, for now just rely on revalidation
    void id;
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
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

      {/* Filters + New button */}
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
              {ESTAT_COLORS[e]?.label ?? e}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <button onClick={() => { setEditTarget(null); setShowForm(v => !v); }}
          className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-[#8E0E1A] text-white text-xs font-semibold hover:bg-[#7A0B16] transition-colors">
          <span className="text-base leading-none">+</span> Nou objectiu
        </button>
      </div>

      {/* New/Edit form */}
      {(showForm && !editTarget) && (
        <div className="bg-white rounded-xl border border-[#8E0E1A]/30 p-5">
          <p className="text-sm font-bold text-[#0A0A0A] mb-4">Nou objectiu</p>
          <ObjectiuForm onClose={() => setShowForm(false)} />
        </div>
      )}

      {editTarget && (
        <div className="bg-white rounded-xl border border-[#8E0E1A]/30 p-5">
          <p className="text-sm font-bold text-[#0A0A0A] mb-4">Editar objectiu</p>
          <ObjectiuForm initial={editTarget} onClose={() => setEditTarget(null)} />
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
          <p className="text-sm text-[#9CA3AF]">Cap objectiu per {filterYear}{filterEstat !== "all" ? ` amb estat "${ESTAT_COLORS[filterEstat]?.label}"` : ""}.</p>
          <button onClick={() => { setEditTarget(null); setShowForm(true); }}
            className="mt-3 text-sm font-semibold text-[#8E0E1A] hover:underline">
            + Crear primer objectiu
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(o => (
            <ObjectiuCard key={o.id} o={o}
              onEdit={obj => { setEditTarget(obj); setShowForm(false); }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
