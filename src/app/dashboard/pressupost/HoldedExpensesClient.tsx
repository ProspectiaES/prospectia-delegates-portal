"use client";

import { useState, useTransition } from "react";
import { saveSupplierCategory } from "@/app/actions/budget";

export interface PurchaseRow {
  id: string;
  doc_number: string | null;
  contact_id: string | null;
  contact_name: string | null;
  date: string | null;
  total: number;
  status: number;
  description: string | null;
  category: string;
  exclude_from_pnl: boolean;
}

export interface SupplierSummary {
  contact_id: string | null;
  contact_name: string;
  category: string;
  exclude_from_pnl: boolean;
  invoices: PurchaseRow[];
  total: number;
}

const CATEGORIES = [
  { value: "personal",   label: "Personal / Nòmines" },
  { value: "oficina",    label: "Oficina / Local" },
  { value: "gestoria",   label: "Gestoria / Assessoria" },
  { value: "tecnologia", label: "Tecnologia / SaaS" },
  { value: "marketing",  label: "Màrqueting" },
  { value: "logistica",  label: "Logística / Transport" },
  { value: "compres",    label: "Compres de producte" },
  { value: "altres",     label: "Altres" },
];

const CAT_LABEL  = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]));

const CAT_COLOR: Record<string, string> = {
  personal:   "bg-blue-50 text-blue-700",
  oficina:    "bg-orange-50 text-orange-700",
  gestoria:   "bg-teal-50 text-teal-700",
  tecnologia: "bg-purple-50 text-purple-700",
  marketing:  "bg-amber-50 text-amber-700",
  logistica:  "bg-emerald-50 text-emerald-700",
  compres:    "bg-rose-50 text-rose-700",
  altres:     "bg-gray-100 text-gray-600",
};

const CAT_SECTION_BG: Record<string, string> = {
  personal:   "bg-blue-50/40",
  oficina:    "bg-orange-50/40",
  gestoria:   "bg-teal-50/40",
  tecnologia: "bg-purple-50/40",
  marketing:  "bg-amber-50/40",
  logistica:  "bg-emerald-50/40",
  compres:    "bg-rose-50/40",
  altres:     "bg-gray-50",
};

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

const fmtDate = (iso: string | null) => iso
  ? new Date(iso).toLocaleDateString("ca-ES", { day: "2-digit", month: "short" })
  : "—";

// ─── Supplier row with inline category picker ─────────────────────────────────

function SupplierRow({
  supplier,
  onUpdated,
}: {
  supplier: SupplierSummary;
  onUpdated: () => void;
}) {
  const [expanded, setExpanded]         = useState(false);
  const [editing, setEditing]           = useState(false);
  const [category, setCategory]         = useState(supplier.category);
  const [exclude, setExclude]           = useState(supplier.exclude_from_pnl);
  const [isPending, startTransition]    = useTransition();
  const [error, setError]               = useState<string | null>(null);

  function save() {
    startTransition(async () => {
      const res = await saveSupplierCategory(
        supplier.contact_id ?? supplier.contact_name,
        supplier.contact_name,
        category,
        exclude,
      );
      if (res.error) { setError(res.error); return; }
      setEditing(false);
      setError(null);
      onUpdated();
    });
  }

  const isExcluded = supplier.exclude_from_pnl;

  return (
    <div className={`rounded-xl border overflow-hidden ${isExcluded ? "border-gray-200 opacity-60" : "border-[#E5E7EB]"} bg-white`}>
      {/* Header */}
      <div className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#FAFAFA] transition-colors ${CAT_SECTION_BG[supplier.category]}`}
           onClick={() => setExpanded(!expanded)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[#0A0A0A] truncate">{supplier.contact_name}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${CAT_COLOR[supplier.category] ?? "bg-gray-100 text-gray-600"}`}>
              {CAT_LABEL[supplier.category] ?? supplier.category}
            </span>
            {isExcluded && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">
                Exclòs del P&amp;L
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">
            {supplier.invoices.length} factura{supplier.invoices.length !== 1 ? "es" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold tabular-nums text-[#0A0A0A]">{fmtEuro(supplier.total)}</span>
          <button
            onClick={e => { e.stopPropagation(); setEditing(!editing); setExpanded(true); }}
            className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm text-[#9CA3AF] hover:text-[#374151] transition-all"
            title="Editar categoria"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 10.5l1.5-1.5 6-6L11 4.5l-6 6L3.5 12 2 10.5z" strokeLinejoin="round"/>
              <path d="M8.5 2.5l2 2" strokeLinecap="round"/>
            </svg>
          </button>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"
               className={`text-[#9CA3AF] transition-transform ${expanded ? "rotate-180" : ""}`}>
            <path d="M3 5l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Category editor */}
      {editing && (
        <div className="px-4 py-3 border-t border-[#F3F4F6] bg-[#FAFAFA] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Categoria</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] focus:outline-none focus:ring-1 focus:ring-[#8E0E1A] bg-white">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer pb-0.5">
                <input type="checkbox" checked={exclude} onChange={e => setExclude(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#8E0E1A]" />
                <span className="text-xs text-[#374151]">Excloure del P&amp;L</span>
              </label>
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={save} disabled={isPending}
              className="text-xs font-bold px-4 py-1.5 rounded-lg bg-[#8E0E1A] text-white hover:bg-[#7A0C17] disabled:opacity-50 transition-colors">
              {isPending ? "Desant…" : "Aplicar a totes les factures"}
            </button>
            <button onClick={() => { setEditing(false); setCategory(supplier.category); setExclude(supplier.exclude_from_pnl); }}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-white transition-colors">
              Cancel·lar
            </button>
          </div>
          <p className="text-[10px] text-[#9CA3AF]">
            Aquesta configuració s&apos;aplicarà a totes les factures d&apos;aquest proveïdor (ara i en futures sincronitzacions).
          </p>
        </div>
      )}

      {/* Invoice list */}
      {expanded && (
        <div className="border-t border-[#F3F4F6] divide-y divide-[#F3F4F6]">
          {supplier.invoices.map(inv => (
            <div key={inv.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
              <span className="text-[#9CA3AF] w-20 shrink-0 tabular-nums">{fmtDate(inv.date)}</span>
              <span className="text-[#6B7280] w-24 shrink-0 font-mono">{inv.doc_number ?? "—"}</span>
              <span className="flex-1 text-[#374151] truncate">{inv.description ?? "—"}</span>
              <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${inv.status === 1 ? "bg-emerald-50 text-emerald-700" : inv.status === 3 ? "bg-gray-100 text-gray-400" : "bg-amber-50 text-amber-700"}`}>
                {inv.status === 1 ? "Pagada" : inv.status === 3 ? "Anulada" : "Pendent"}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-[#0A0A0A] w-20 text-right">{fmtEuro(inv.total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HoldedExpensesClient({
  suppliers,
  period,
}: {
  suppliers: SupplierSummary[];
  period: string;
}) {
  const [, forceUpdate] = useState(0);

  const catOrder = ["personal", "oficina", "gestoria", "tecnologia", "marketing", "logistica", "compres", "altres"];

  // Group by category, sort by total desc within each category
  const grouped: Record<string, SupplierSummary[]> = {};
  for (const cat of catOrder) grouped[cat] = [];
  for (const s of suppliers) {
    const cat = catOrder.includes(s.category) ? s.category : "altres";
    grouped[cat].push(s);
  }
  for (const cat of catOrder) {
    grouped[cat].sort((a, b) => b.total - a.total);
  }

  const totalIncluded = suppliers.filter(s => !s.exclude_from_pnl).reduce((sum, s) => sum + s.total, 0);
  const totalExcluded = suppliers.filter(s => s.exclude_from_pnl).reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-bold text-[#0A0A0A]">Despeses reals · Holded</h2>
          <p className="text-xs text-[#6B7280] mt-0.5 capitalize">
            {period} · {suppliers.length} proveïdors ·
            <span className="font-semibold text-[#0A0A0A] ml-1">{fmtEuro(totalIncluded)}</span> al P&amp;L
            {totalExcluded > 0 && <span className="text-[#9CA3AF]"> · {fmtEuro(totalExcluded)} exclosos</span>}
          </p>
        </div>
        <div className="text-right text-xs">
          <p className="text-[10px] text-[#9CA3AF]">Clica la icona ✎ per canviar la categoria d&apos;un proveïdor</p>
        </div>
      </div>

      <div className="space-y-6">
        {catOrder.map(cat => {
          const catSuppliers = grouped[cat] ?? [];
          if (catSuppliers.length === 0) return null;
          const catTotal = catSuppliers.filter(s => !s.exclude_from_pnl).reduce((s, x) => s + x.total, 0);
          return (
            <div key={cat} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${CAT_COLOR[cat]}`}>
                  {CAT_LABEL[cat]}
                </span>
                <span className="text-xs font-semibold text-[#374151] tabular-nums">{fmtEuro(catTotal)}</span>
                <div className="flex-1 h-px bg-[#F3F4F6]" />
              </div>
              <div className="space-y-2 pl-1">
                {catSuppliers.map(s => (
                  <SupplierRow
                    key={s.contact_id ?? s.contact_name}
                    supplier={s}
                    onUpdated={() => forceUpdate(n => n + 1)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
