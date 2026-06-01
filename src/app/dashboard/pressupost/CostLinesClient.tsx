"use client";

import { useActionState, useRef, useState } from "react";
import { saveCostLine, deleteCostLine, type CostLineState } from "@/app/actions/budget";

export interface CostLine {
  id: number;
  concept: string;
  category: string;
  amount: number;
  frequency: string;
  starts_at: string | null;
  ends_at: string | null;
  status: string;
  notes: string | null;
}

const CATEGORIES = [
  { value: "personal",   label: "Personal" },
  { value: "tecnologia", label: "Tecnologia" },
  { value: "marketing",  label: "Màrqueting" },
  { value: "logistica",  label: "Logística" },
  { value: "altres",     label: "Altres" },
];
const CAT_ORDER  = CATEGORIES.map(c => c.value);
const CAT_LABEL  = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]));

const FREQUENCIES = [
  { value: "mensual",    label: "Mensual" },
  { value: "trimestral", label: "Trimestral" },
  { value: "anual",      label: "Anual" },
];
const FREQ_LABEL = Object.fromEntries(FREQUENCIES.map(f => [f.value, f.label]));

const STATUSES = [
  { value: "actiu",      label: "Actiu" },
  { value: "planificat", label: "Planificat" },
  { value: "pausat",     label: "Pausat" },
];
const STATUS_LABEL = Object.fromEntries(STATUSES.map(s => [s.value, s.label]));

const CAT_COLOR: Record<string, string> = {
  personal:   "bg-blue-50 text-blue-700 border-blue-200",
  tecnologia: "bg-purple-50 text-purple-700 border-purple-200",
  marketing:  "bg-amber-50 text-amber-700 border-amber-200",
  logistica:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  altres:     "bg-gray-100 text-gray-600 border-gray-200",
};

const CAT_HEADER_BG: Record<string, string> = {
  personal:   "bg-blue-50/60",
  tecnologia: "bg-purple-50/60",
  marketing:  "bg-amber-50/60",
  logistica:  "bg-emerald-50/60",
  altres:     "bg-gray-50",
};

const STATUS_COLOR: Record<string, string> = {
  actiu:      "bg-emerald-50 text-emerald-700",
  planificat: "bg-sky-50 text-sky-700",
  pausat:     "bg-gray-100 text-gray-400 line-through",
};

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

function toMonthly(amount: number, frequency: string): number {
  if (frequency === "trimestral") return amount / 3;
  if (frequency === "anual")      return amount / 12;
  return amount;
}

// ─── Inline edit form ─────────────────────────────────────────────────────────

function RowForm({ initial, onClose }: { initial?: CostLine; onClose: () => void }) {
  const [state, formAction, pending] = useActionState<CostLineState | null, FormData>(
    saveCostLine, null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  if (state?.success) onClose();

  const inp = "w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] focus:outline-none focus:ring-1 focus:ring-[#8E0E1A] bg-white";

  return (
    <div className="border border-[#8E0E1A]/20 rounded-xl bg-[#FEFCFC] p-4 my-2 shadow-sm">
      <form ref={formRef} action={formAction} className="space-y-3">
        {initial && <input type="hidden" name="id" value={initial.id} />}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Concepte *</label>
            <input name="concept" defaultValue={initial?.concept} required className={inp} placeholder="ex. Servidor VPS" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Categoria</label>
            <select name="category" defaultValue={initial?.category ?? "altres"} className={inp}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Estat</label>
            <select name="status" defaultValue={initial?.status ?? "actiu"} className={inp}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Import *</label>
            <div className="relative">
              <input name="amount" type="number" step="0.01" min="0" required
                defaultValue={initial?.amount ?? ""} className={`${inp} pr-6`} placeholder="0,00" />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#9CA3AF]">€</span>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Freqüència</label>
            <select name="frequency" defaultValue={initial?.frequency ?? "mensual"} className={inp}>
              {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Inici</label>
            <input name="starts_at" type="date" defaultValue={initial?.starts_at ?? ""} className={inp} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Fi</label>
            <input name="ends_at" type="date" defaultValue={initial?.ends_at ?? ""} className={inp} />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Notes</label>
          <input name="notes" defaultValue={initial?.notes ?? ""} className={inp} placeholder="Descripció opcional" />
        </div>

        {state?.error && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{state.error}</p>}

        <div className="flex items-center gap-2 pt-1">
          <button type="submit" disabled={pending}
            className="text-xs font-bold px-4 py-1.5 rounded-lg bg-[#8E0E1A] text-white hover:bg-[#7A0C17] disabled:opacity-50 transition-colors">
            {pending ? "Desant…" : initial ? "Actualitzar" : "Afegir línia"}
          </button>
          <button type="button" onClick={onClose}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] transition-colors">
            Cancel·lar
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Single line row ──────────────────────────────────────────────────────────

function LineRow({
  line, onEdit, deletingId, onDelete,
}: {
  line: CostLine;
  onEdit: () => void;
  deletingId: number | null;
  onDelete: (id: number) => void;
}) {
  const monthly  = toMonthly(line.amount, line.frequency);
  const isPaused = line.status === "pausat";

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 group hover:bg-[#FAFAFA] transition-colors ${isPaused ? "opacity-50" : ""}`}>
      {/* Concept + notes */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-[#0A0A0A] truncate">{line.concept}</span>
          <span className={`inline-flex items-center px-1.5 py-0 rounded text-[9px] font-bold leading-4 border ${STATUS_COLOR[line.status] ?? "bg-gray-100 text-gray-500"}`}>
            {STATUS_LABEL[line.status] ?? line.status}
          </span>
          {line.starts_at && (
            <span className="text-[10px] text-[#9CA3AF]">
              des de {new Date(line.starts_at).toLocaleDateString("ca-ES", { month: "short", year: "numeric" })}
            </span>
          )}
        </div>
        {line.notes && <p className="text-[10px] text-[#9CA3AF] mt-0.5 truncate">{line.notes}</p>}
      </div>

      {/* Frequency */}
      <span className="text-[11px] text-[#9CA3AF] w-20 text-right shrink-0 hidden sm:block">
        {fmtEuro(line.amount)} · {FREQ_LABEL[line.frequency]}
      </span>

      {/* Monthly equiv */}
      <span className="text-xs font-semibold tabular-nums text-[#0A0A0A] w-24 text-right shrink-0">
        {fmtEuro(monthly)}/mes
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={onEdit} title="Editar"
          className="p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#9CA3AF] hover:text-[#374151] transition-colors">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 10.5l1.5-1.5 6-6L11 4.5l-6 6L3.5 12 2 10.5z" strokeLinejoin="round"/>
            <path d="M8.5 2.5l2 2" strokeLinecap="round"/>
          </svg>
        </button>
        <button onClick={() => onDelete(line.id)} disabled={deletingId === line.id} title="Eliminar"
          className="p-1.5 rounded-lg hover:bg-red-50 text-[#9CA3AF] hover:text-red-600 transition-colors disabled:opacity-40">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 3.5h9M4.5 3.5V2.5h4v1M5.5 6v4M7.5 6v4M3 3.5l.5 7h6l.5-7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CostLinesClient({ lines }: { lines: CostLine[] }) {
  const [adding, setAdding]       = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const totalActive = lines
    .filter(l => l.status === "actiu")
    .reduce((s, l) => s + toMonthly(l.amount, l.frequency), 0);

  // Group by category
  const grouped: Record<string, CostLine[]> = {};
  for (const cat of CAT_ORDER) grouped[cat] = [];
  for (const line of lines) {
    const cat = CAT_ORDER.includes(line.category) ? line.category : "altres";
    grouped[cat].push(line);
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    await deleteCostLine(id);
    setDeletingId(null);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[#0A0A0A]">Costos fixos planificats</h2>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Total mensual actiu:&nbsp;
            <span className="font-bold text-[#0A0A0A]">{fmtEuro(totalActive)}</span>
          </p>
        </div>
        <button
          onClick={() => { setAdding(true); setEditingId(null); }}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-[#8E0E1A] text-white hover:bg-[#7A0C17] transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 2v8M2 6h8" strokeLinecap="round" />
          </svg>
          Nova despesa
        </button>
      </div>

      {/* Add form (top) */}
      {adding && <RowForm onClose={() => setAdding(false)} />}

      {/* Grouped table */}
      <div className="rounded-xl border border-[#E5E7EB] overflow-hidden divide-y divide-[#E5E7EB] bg-white">
        {CAT_ORDER.map(cat => {
          const catLines  = grouped[cat] ?? [];
          const catTotal  = catLines.filter(l => l.status === "actiu").reduce((s, l) => s + toMonthly(l.amount, l.frequency), 0);
          if (catLines.length === 0) return null;

          return (
            <div key={cat}>
              {/* Category header */}
              <div className={`flex items-center justify-between px-4 py-2 ${CAT_HEADER_BG[cat]}`}>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${CAT_COLOR[cat]}`}>
                  {CAT_LABEL[cat]}
                </span>
                <span className="text-xs font-semibold text-[#374151] tabular-nums">
                  {fmtEuro(catTotal)}<span className="text-[10px] text-[#9CA3AF] font-normal">/mes</span>
                </span>
              </div>

              {/* Lines */}
              <div className="divide-y divide-[#F3F4F6]">
                {catLines.map(line =>
                  editingId === line.id ? (
                    <div key={line.id} className="px-4 py-2">
                      <RowForm initial={line} onClose={() => setEditingId(null)} />
                    </div>
                  ) : (
                    <LineRow
                      key={line.id}
                      line={line}
                      onEdit={() => { setEditingId(line.id); setAdding(false); }}
                      deletingId={deletingId}
                      onDelete={handleDelete}
                    />
                  )
                )}
              </div>
            </div>
          );
        })}

        {lines.length === 0 && !adding && (
          <div className="text-center text-xs text-[#9CA3AF] py-10">
            Carregant categories per defecte…
          </div>
        )}
      </div>

      {/* Footer total */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
        <span className="text-xs text-[#6B7280]">
          <span className="font-semibold text-[#0A0A0A]">{lines.filter(l => l.status === "actiu").length}</span> línies actives ·{" "}
          <span className="font-semibold text-[#0A0A0A]">{lines.filter(l => l.status === "planificat").length}</span> planificades
        </span>
        <div className="text-right">
          <span className="text-[10px] text-[#9CA3AF] block">Total mensual (actiu)</span>
          <span className="text-sm font-bold text-[#0A0A0A] tabular-nums">{fmtEuro(totalActive)}</span>
        </div>
      </div>
    </div>
  );
}
