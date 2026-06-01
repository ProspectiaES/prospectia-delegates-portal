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

const FREQUENCIES = [
  { value: "mensual",     label: "Mensual" },
  { value: "trimestral",  label: "Trimestral" },
  { value: "anual",       label: "Anual" },
];

const STATUSES = [
  { value: "actiu",       label: "Actiu" },
  { value: "planificat",  label: "Planificat" },
  { value: "pausat",      label: "Pausat" },
];

const CAT_COLOR: Record<string, string> = {
  personal:   "bg-blue-50 text-blue-700",
  tecnologia: "bg-purple-50 text-purple-700",
  marketing:  "bg-amber-50 text-amber-700",
  logistica:  "bg-emerald-50 text-emerald-700",
  altres:     "bg-gray-100 text-gray-600",
};

const STATUS_COLOR: Record<string, string> = {
  actiu:      "bg-emerald-50 text-emerald-700",
  planificat: "bg-sky-50 text-sky-700",
  pausat:     "bg-gray-100 text-gray-500",
};

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

function toMonthlyCost(amount: number, frequency: string): number {
  if (frequency === "trimestral") return amount / 3;
  if (frequency === "anual")      return amount / 12;
  return amount;
}

// ─── Row form (inline add / edit) ─────────────────────────────────────────────

function RowForm({
  initial,
  onClose,
}: {
  initial?: CostLine;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<CostLineState | null, FormData>(
    saveCostLine,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  if (state?.success) {
    onClose();
  }

  const inp = "w-full text-xs px-2 py-1.5 rounded border border-[#E5E7EB] focus:outline-none focus:ring-1 focus:ring-[#8E0E1A] bg-white";
  const sel = inp;

  return (
    <tr className="bg-[#FEFCFC]">
      <td colSpan={7} className="p-3">
        <form ref={formRef} action={formAction} className="space-y-3">
          {initial && <input type="hidden" name="id" value={initial.id} />}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Concepte *</label>
              <input name="concept" defaultValue={initial?.concept} required className={inp} placeholder="ex. Servidor VPS" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Categoria</label>
              <select name="category" defaultValue={initial?.category ?? "altres"} className={sel}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Estat</label>
              <select name="status" defaultValue={initial?.status ?? "actiu"} className={sel}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Import *</label>
              <input name="amount" type="number" step="0.01" min="0" required
                defaultValue={initial?.amount} className={inp} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Freqüència</label>
              <select name="frequency" defaultValue={initial?.frequency ?? "mensual"} className={sel}>
                {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Inici</label>
              <input name="starts_at" type="date" defaultValue={initial?.starts_at ?? ""} className={inp} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Fi</label>
              <input name="ends_at" type="date" defaultValue={initial?.ends_at ?? ""} className={inp} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Notes</label>
            <input name="notes" defaultValue={initial?.notes ?? ""} className={inp} placeholder="Opcional" />
          </div>

          {state?.error && (
            <p className="text-xs text-red-600">{state.error}</p>
          )}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={pending}
              className="text-xs font-semibold px-4 py-1.5 rounded bg-[#8E0E1A] text-white hover:bg-[#7A0C17] disabled:opacity-50 transition-colors"
            >
              {pending ? "Desant…" : initial ? "Actualitzar" : "Afegir"}
            </button>
            <button type="button" onClick={onClose}
              className="text-xs font-medium px-3 py-1.5 rounded border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] transition-colors">
              Cancel·lar
            </button>
          </div>
        </form>
      </td>
    </tr>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function CostLinesClient({ lines }: { lines: CostLine[] }) {
  const [adding, setAdding]         = useState(false);
  const [editingId, setEditingId]   = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const activeCosts = lines
    .filter(l => l.status === "actiu")
    .reduce((s, l) => s + toMonthlyCost(l.amount, l.frequency), 0);

  async function handleDelete(id: number) {
    setDeletingId(id);
    await deleteCostLine(id);
    setDeletingId(null);
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[#0A0A0A]">Costos planificats</h2>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Total mensual actiu:
            <span className="font-semibold text-[#0A0A0A] ml-1">{fmtEuro(activeCosts)}</span>
          </p>
        </div>
        <button
          onClick={() => { setAdding(true); setEditingId(null); }}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#8E0E1A] text-white hover:bg-[#7A0C17] transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 2v8M2 6h8" strokeLinecap="round" />
          </svg>
          Nova línia
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#E5E7EB] overflow-hidden bg-white">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <th className="text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-4 py-2.5">Concepte</th>
              <th className="text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-3 py-2.5">Categoria</th>
              <th className="text-right text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-3 py-2.5">Import</th>
              <th className="text-center text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-3 py-2.5">Freq.</th>
              <th className="text-right text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-3 py-2.5">€/mes</th>
              <th className="text-center text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-3 py-2.5">Estat</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6]">
            {adding && (
              <RowForm onClose={() => setAdding(false)} />
            )}

            {lines.length === 0 && !adding && (
              <tr>
                <td colSpan={7} className="text-center text-xs text-[#9CA3AF] py-8">
                  Encara no hi ha línies de cost. Clica "Nova línia" per afegir-ne.
                </td>
              </tr>
            )}

            {lines.map((line) =>
              editingId === line.id ? (
                <RowForm key={line.id} initial={line} onClose={() => setEditingId(null)} />
              ) : (
                <tr key={line.id} className="hover:bg-[#FAFAFA] transition-colors group">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-[#0A0A0A]">{line.concept}</p>
                    {line.notes && <p className="text-[10px] text-[#9CA3AF] mt-0.5">{line.notes}</p>}
                    {line.starts_at && (
                      <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                        Des de {new Date(line.starts_at).toLocaleDateString("ca-ES", { month: "short", year: "numeric" })}
                        {line.ends_at && ` fins ${new Date(line.ends_at).toLocaleDateString("ca-ES", { month: "short", year: "numeric" })}`}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${CAT_COLOR[line.category] ?? "bg-gray-100 text-gray-600"}`}>
                      {CATEGORIES.find(c => c.value === line.category)?.label ?? line.category}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium tabular-nums">{fmtEuro(line.amount)}</td>
                  <td className="px-3 py-2.5 text-center text-[#6B7280]">
                    {FREQUENCIES.find(f => f.value === line.frequency)?.label ?? line.frequency}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-[#0A0A0A]">
                    {fmtEuro(toMonthlyCost(line.amount, line.frequency))}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${STATUS_COLOR[line.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUSES.find(s => s.value === line.status)?.label ?? line.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <button
                        onClick={() => { setEditingId(line.id); setAdding(false); }}
                        className="p-1 rounded hover:bg-[#F3F4F6] text-[#6B7280] transition-colors"
                        title="Editar"
                      >
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M2 10.5l1.5-1.5 6-6L11 4.5l-6 6L3.5 12 2 10.5z" strokeLinejoin="round"/>
                          <path d="M8.5 2.5l2 2" strokeLinecap="round"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(line.id)}
                        disabled={deletingId === line.id}
                        className="p-1 rounded hover:bg-red-50 text-[#9CA3AF] hover:text-red-600 transition-colors disabled:opacity-40"
                        title="Eliminar"
                      >
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M2 3.5h9M4.5 3.5V2.5h4v1M5.5 6v4M7.5 6v4M3 3.5l.5 7h6l.5-7" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
