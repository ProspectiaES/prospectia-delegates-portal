"use client";

import { useReducer, useEffect, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { calculate } from "@/lib/economic-engine/calculator";
import type {
  EconomicSimulation, MarginResult, CostLine, CommissionLayer,
  Promotion, CostType, CommType, CommBase, PromoType, ProjectType,
} from "@/lib/economic-engine/types";

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtE   = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);
const fmtP   = (n: number, d = 1) => `${n.toFixed(d)}%`;
const inp    = "w-full text-sm px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] focus:outline-none focus:ring-1 focus:ring-[#8E0E1A] bg-white";
const selCls = inp;

// ─── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: "SET_FIELD"; field: keyof EconomicSimulation; value: unknown }
  | { type: "SET_COST_LINES"; lines: CostLine[] }
  | { type: "ADD_COST_LINE"; line: CostLine }
  | { type: "UPDATE_COST_LINE"; idx: number; line: CostLine }
  | { type: "REMOVE_COST_LINE"; idx: number }
  | { type: "ADD_COMM_LAYER"; layer: CommissionLayer }
  | { type: "UPDATE_COMM_LAYER"; idx: number; layer: CommissionLayer }
  | { type: "REMOVE_COMM_LAYER"; idx: number }
  | { type: "ADD_PROMO"; promo: Promotion }
  | { type: "UPDATE_PROMO"; idx: number; promo: Promotion }
  | { type: "REMOVE_PROMO"; idx: number };

function reducer(state: EconomicSimulation, action: Action): EconomicSimulation {
  switch (action.type) {
    case "SET_FIELD":        return { ...state, [action.field]: action.value };
    case "SET_COST_LINES":   return { ...state, cost_lines: action.lines };
    case "ADD_COST_LINE":    return { ...state, cost_lines: [...(state.cost_lines ?? []), action.line] };
    case "UPDATE_COST_LINE": return { ...state, cost_lines: (state.cost_lines ?? []).map((l, i) => i === action.idx ? action.line : l) };
    case "REMOVE_COST_LINE": return { ...state, cost_lines: (state.cost_lines ?? []).filter((_, i) => i !== action.idx) };
    case "ADD_COMM_LAYER":    return { ...state, commission_layers: [...(state.commission_layers ?? []), action.layer] };
    case "UPDATE_COMM_LAYER": return { ...state, commission_layers: (state.commission_layers ?? []).map((l, i) => i === action.idx ? action.layer : l) };
    case "REMOVE_COMM_LAYER": return { ...state, commission_layers: (state.commission_layers ?? []).filter((_, i) => i !== action.idx) };
    case "ADD_PROMO":    return { ...state, promotions: [...(state.promotions ?? []), action.promo] };
    case "UPDATE_PROMO": return { ...state, promotions: (state.promotions ?? []).map((p, i) => i === action.idx ? action.promo : p) };
    case "REMOVE_PROMO": return { ...state, promotions: (state.promotions ?? []).filter((_, i) => i !== action.idx) };
    default: return state;
  }
}

// ─── Waterfall row ────────────────────────────────────────────────────────────

function WaterfallRow({
  label, amount, pct, accent, bold, indent, negative,
}: {
  label: string; amount: number; pct: number;
  accent?: string; bold?: boolean; indent?: boolean; negative?: boolean;
}) {
  const textCls = accent ?? (negative ? "text-red-600" : bold ? "text-[#0A0A0A]" : "text-[#374151]");
  return (
    <div className={`flex items-center justify-between py-1.5 ${bold ? "border-t border-[#E5E7EB] mt-1 pt-2" : ""}`}>
      <span className={`text-xs ${indent ? "pl-4 text-[#6B7280]" : bold ? "font-bold text-[#374151]" : "text-[#6B7280]"}`}>{label}</span>
      <div className="flex items-center gap-3 text-right">
        <span className={`text-[10px] tabular-nums w-12 text-[#9CA3AF]`}>{fmtP(pct)}</span>
        <span className={`text-sm font-semibold tabular-nums w-24 ${textCls}`}>{fmtE(amount)}</span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SimulationEditor({
  simulation: initial,
  initialResult,
  isNew = false,
}: {
  simulation: EconomicSimulation;
  initialResult: MarginResult | null;
  isNew?: boolean;
}) {
  const router = useRouter();
  const [sim, dispatch] = useReducer(reducer, initial);
  const [result, setResult] = useState<MarginResult | null>(initialResult);
  const [saving, setSaving] = useState(false);
  const [settingRef, setSettingRef] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Real-time calculation with 300ms debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setResult(calculate(sim));
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [sim]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const url  = isNew ? "/api/economic-engine/simulations" : `/api/economic-engine/simulations/${sim.id}`;
      const meth = isNew ? "POST" : "PATCH";
      const res  = await fetch(url, {
        method: meth,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sim),
      });
      const data = await res.json() as { id?: string; error?: string };
      if (!res.ok) { setSaveError(data.error ?? "Error"); return; }
      if (isNew && data.id) router.replace(`/dashboard/economic-engine/${data.id}`);
      else router.refresh();
    } catch (e) { setSaveError((e as Error).message); }
    finally { setSaving(false); }
  }, [sim, isNew, router]);

  const handleSetReference = useCallback(async () => {
    if (!sim.id) return;
    setSettingRef(true);
    await fetch(`/api/economic-engine/simulations/${sim.id}/set-reference`, { method: "POST" });
    setSettingRef(false);
    router.refresh();
  }, [sim.id, router]);

  const price = sim.net_sale_price ?? 0;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-[1440px] mx-auto px-5 py-6">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href="/dashboard/economic-engine" className="text-[#9CA3AF] hover:text-[#8E0E1A] text-sm transition-colors">
          ← Simulacions
        </Link>
        <input
          value={sim.name}
          onChange={e => dispatch({ type: "SET_FIELD", field: "name", value: e.target.value })}
          className="text-xl font-bold text-[#0A0A0A] bg-transparent border-b border-transparent hover:border-[#E5E7EB] focus:border-[#8E0E1A] focus:outline-none px-1 flex-1 min-w-[200px]"
        />
        <div className="flex items-center gap-2 ml-auto">
          {sim.id && !sim.is_performance_reference && (
            <button onClick={handleSetReference} disabled={settingRef}
              className="text-xs font-semibold px-3 py-2 rounded-lg border border-[#8E0E1A] text-[#8E0E1A] hover:bg-[#FEF2F2] disabled:opacity-50 transition-colors">
              {settingRef ? "Activant…" : "Definir com a referència P&L"}
            </button>
          )}
          {sim.is_performance_reference && (
            <span className="text-[10px] font-bold px-2.5 py-1.5 rounded-full bg-[#FEF2F2] text-[#8E0E1A] border border-[#FECACA]">
              ✓ Referència P&L activa
            </span>
          )}
          <button onClick={handleSave} disabled={saving}
            className="text-sm font-bold px-4 py-2 rounded-xl bg-[#8E0E1A] text-white hover:bg-[#7A0C17] disabled:opacity-50 transition-colors">
            {saving ? "Desant…" : "Desar simulació"}
          </button>
        </div>
      </div>
      {saveError && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-4 py-2 mb-4">{saveError}</p>}

      {/* 2-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ── LEFT: Editor ───────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Configuració bàsica */}
          <Section title="Configuració bàsica">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Preu de venda net (sense IVA)</label>
                <div className="relative">
                  <input type="number" step="0.01" min="0"
                    value={sim.net_sale_price ?? ""}
                    onChange={e => dispatch({ type: "SET_FIELD", field: "net_sale_price", value: parseFloat(e.target.value) || null })}
                    className={`${inp} pr-7`} placeholder="0.00" />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[#9CA3AF]">€</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Tipus de projecte</label>
                <select value={sim.project_type} onChange={e => dispatch({ type: "SET_FIELD", field: "project_type", value: e.target.value as ProjectType })} className={selCls}>
                  <option value="national">Nacional</option>
                  <option value="international">Internacional</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">% Overhead empresa (estructura)</label>
                <div className="relative">
                  <input type="number" step="0.5" min="0" max="100"
                    value={sim.estructura_pct}
                    onChange={e => dispatch({ type: "SET_FIELD", field: "estructura_pct", value: parseFloat(e.target.value) || 0 })}
                    className={`${inp} pr-7`} />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[#9CA3AF]">%</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">% Logística {sim.project_type === "international" ? "(0 — internacional)" : ""}</label>
                <div className="relative">
                  <input type="number" step="0.5" min="0" max="100"
                    disabled={sim.project_type === "international"}
                    value={sim.project_type === "international" ? 0 : sim.logistics_pct}
                    onChange={e => dispatch({ type: "SET_FIELD", field: "logistics_pct", value: parseFloat(e.target.value) || 0 })}
                    className={`${inp} pr-7 disabled:opacity-50`} />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[#9CA3AF]">%</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Notes</label>
              <textarea value={sim.notes ?? ""} rows={2}
                onChange={e => dispatch({ type: "SET_FIELD", field: "notes", value: e.target.value })}
                className={`${inp} resize-none`} placeholder="Descripció de l'escenari…" />
            </div>
          </Section>

          {/* Costos de producció */}
          <Section title="Costos de producció" subtitle={`Total: ${fmtE((sim.cost_lines ?? []).reduce((s, l) => s + Number(l.unit_cost), 0))}/ud`}>
            <div className="space-y-2">
              {(sim.cost_lines ?? []).map((l, idx) => (
                <CostLineRow key={idx} line={l}
                  onChange={line => dispatch({ type: "UPDATE_COST_LINE", idx, line })}
                  onRemove={() => dispatch({ type: "REMOVE_COST_LINE", idx })}
                />
              ))}
              <button onClick={() => dispatch({ type: "ADD_COST_LINE", line: { cost_type: "other", supplier_name: "", unit_cost: 0, currency: "EUR", sort_order: (sim.cost_lines?.length ?? 0) * 10, supplier_source: "manual" } })}
                className="w-full text-xs font-semibold py-2 rounded-lg border border-dashed border-[#D1D5DB] text-[#6B7280] hover:border-[#8E0E1A] hover:text-[#8E0E1A] transition-colors">
                + Afegir línia de cost
              </button>
            </div>
          </Section>

          {/* Comissions */}
          <Section title="Capes de comissió" subtitle={`Total: ${fmtE((result?.totalCommissions ?? 0))}`}>
            <div className="space-y-2">
              {(sim.commission_layers ?? []).map((l, idx) => (
                <CommLayerRow key={idx} layer={l}
                  onChange={layer => dispatch({ type: "UPDATE_COMM_LAYER", idx, layer })}
                  onRemove={() => dispatch({ type: "REMOVE_COMM_LAYER", idx })}
                />
              ))}
              <button onClick={() => dispatch({ type: "ADD_COMM_LAYER", layer: { layer_order: (sim.commission_layers?.length ?? 0) + 1, layer_name: "Delegado", commission_type: "percent", value: 20, base: "net_sale_price", active: true } })}
                className="w-full text-xs font-semibold py-2 rounded-lg border border-dashed border-[#D1D5DB] text-[#6B7280] hover:border-[#8E0E1A] hover:text-[#8E0E1A] transition-colors">
                + Afegir capa de comissió
              </button>
            </div>
          </Section>

          {/* Promocions */}
          <Section title="Promocions" subtitle={`Impacte: ${fmtE(result?.totalPromoImpact ?? 0)}/ud`}>
            <div className="space-y-2">
              {(sim.promotions ?? []).map((p, idx) => (
                <PromoRow key={idx} promo={p}
                  onChange={promo => dispatch({ type: "UPDATE_PROMO", idx, promo })}
                  onRemove={() => dispatch({ type: "REMOVE_PROMO", idx })}
                />
              ))}
              <button onClick={() => dispatch({ type: "ADD_PROMO", promo: { promo_type: "discount_pct", label: "Promo", discount_pct: 10, active: true } })}
                className="w-full text-xs font-semibold py-2 rounded-lg border border-dashed border-[#D1D5DB] text-[#6B7280] hover:border-[#8E0E1A] hover:text-[#8E0E1A] transition-colors">
                + Afegir promoció
              </button>
            </div>
          </Section>
        </div>

        {/* ── RIGHT: Result ───────────────────────────────────────────────── */}
        <div className="space-y-5 xl:sticky xl:top-6 xl:self-start">

          {/* Alerts */}
          {result && result.alerts.length > 0 && (
            <div className="space-y-2">
              {result.alerts.map((a, i) => (
                <div key={i} className={`flex items-start gap-2.5 px-4 py-3 rounded-xl text-xs ${
                  a.severity === "error"   ? "bg-red-50 text-red-700 border border-red-200" :
                  a.severity === "warning" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                  "bg-blue-50 text-blue-700 border border-blue-100"
                }`}>
                  <span className="text-base leading-none mt-0.5">
                    {a.severity === "error" ? "⛔" : a.severity === "warning" ? "⚠️" : "ℹ️"}
                  </span>
                  {a.message}
                </div>
              ))}
            </div>
          )}

          {/* Waterfall */}
          {result && price > 0 && (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[#0A0A0A]">Cascada de marges</h3>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${result.isViable ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  {result.isViable ? "✓ Viable" : "✗ No viable"}
                </span>
              </div>

              <div className="space-y-0.5">
                <WaterfallRow label="Preu net de venda"     amount={price}                        pct={100}                            bold />
                <WaterfallRow label="− Cost de producció"   amount={-result.unitProductionCost}   pct={result.unitProductionCost / price * 100}   indent negative />
                <WaterfallRow label="− Estructura"           amount={-result.estructuraCost}       pct={result.estructuraCost / price * 100}       indent negative />
                {result.logisticsCost > 0 && (
                  <WaterfallRow label="− Logística"           amount={-result.logisticsCost}        pct={result.logisticsCost / price * 100}        indent negative />
                )}
                <WaterfallRow label="= Marge brut"          amount={result.grossMargin}           pct={result.grossMarginPct}          bold accent={result.grossMargin >= 0 ? "text-emerald-600" : "text-red-600"} />

                {result.commissionBreakdown.map((c, i) => (
                  <WaterfallRow key={i} label={`− ${c.layer_name} (${c.commission_type === "percent" ? `${c.value}%` : `${fmtE(c.value)}/ud`})`} amount={-c.amount} pct={c.amount / price * 100} indent negative />
                ))}
                <WaterfallRow label="= Marge post-comissions" amount={result.marginAfterCommissions} pct={result.marginAfterCommissionsPct} bold accent={result.marginAfterCommissions >= 0 ? "text-blue-700" : "text-red-600"} />

                {result.promoDetails.map((p, i) => (
                  <WaterfallRow key={i} label={`− ${p.label}`} amount={-p.impact_amount} pct={p.impact_amount / price * 100} indent negative />
                ))}

                <div className="mt-2 pt-2 border-t-2 border-[#0A0A0A]">
                  <WaterfallRow label="= MARGE NET"           amount={result.marginAfterPromos}    pct={result.marginAfterPromosPct}   bold accent={result.marginAfterPromos >= 0 ? "text-[#8E0E1A]" : "text-red-600"} />
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[#F3F4F6]">
                {[
                  { label: "Marge brut",        value: fmtP(result.grossMarginPct),            cls: result.grossMarginPct >= 30 ? "text-emerald-600" : result.grossMarginPct >= 15 ? "text-amber-600" : "text-red-600" },
                  { label: "Marge net",          value: fmtP(result.marginAfterPromosPct),      cls: result.marginAfterPromosPct >= 20 ? "text-emerald-600" : result.marginAfterPromosPct >= 10 ? "text-amber-600" : "text-red-600" },
                  { label: "Preu mínim viable",  value: fmtE(result.minimumViablePrice),        cls: "text-[#374151]" },
                  { label: "% Comissions/Preu",  value: fmtP(result.totalCommissions / price * 100), cls: "text-[#374151]" },
                ].map(kpi => (
                  <div key={kpi.label} className="bg-[#F9FAFB] rounded-xl p-3">
                    <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">{kpi.label}</p>
                    <p className={`text-lg font-bold mt-0.5 tabular-nums ${kpi.cls}`}>{kpi.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!result || price <= 0 ? (
            <div className="bg-[#F9FAFB] rounded-2xl border border-dashed border-[#E5E7EB] p-10 text-center text-sm text-[#9CA3AF]">
              Introdueix el preu de venda net per veure els resultats →
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F3F4F6]">
        <h3 className="text-sm font-bold text-[#0A0A0A]">{title}</h3>
        {subtitle && <span className="text-xs text-[#6B7280]">{subtitle}</span>}
      </div>
      <div className="px-5 py-4 space-y-3">{children}</div>
    </div>
  );
}

function CostLineRow({ line, onChange, onRemove }: { line: CostLine; onChange: (l: CostLine) => void; onRemove: () => void }) {
  const si = "text-xs px-2 py-1.5 rounded-lg border border-[#E5E7EB] focus:outline-none focus:ring-1 focus:ring-[#8E0E1A] bg-white";
  const isCustom = line.cost_type === "custom";
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-12 gap-1.5 items-center">
        <input value={line.supplier_name} onChange={e => onChange({ ...line, supplier_name: e.target.value })} placeholder="Proveïdor" className={`${si} col-span-4`} />
        <select value={line.cost_type} onChange={e => onChange({ ...line, cost_type: e.target.value as CostType, cost_label: e.target.value === "custom" ? (line.cost_label ?? "") : undefined })} className={`${si} col-span-3`}>
          {[
            ["packaging",   "Packaging"],
            ["labels",      "Etiquetes"],
            ["assembly",    "Assemblatge"],
            ["fabricacio",  "Fabricació"],
            ["import",      "Importació"],
            ["logistics",   "Logística"],
            ["other",       "Altres"],
            ["custom",      "Lliure…"],
          ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <div className="col-span-3 relative">
          <input type="number" step="0.01" min="0" value={line.unit_cost} onChange={e => onChange({ ...line, unit_cost: parseFloat(e.target.value) || 0 })} className={`${si} w-full pr-6 text-right`} />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#9CA3AF]">€</span>
        </div>
        {!isCustom && (
          <input value={line.cost_label ?? ""} onChange={e => onChange({ ...line, cost_label: e.target.value })} placeholder="Nota" className={`${si} col-span-1`} />
        )}
        {isCustom && <div className="col-span-1" />}
        <button onClick={onRemove} className="col-span-1 p-1.5 rounded-lg text-[#D1D5DB] hover:text-red-500 hover:bg-red-50 transition-colors">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h8M4.5 3V2h3v1M5 5.5v4M7 5.5v4M2.5 3l.5 7h6l.5-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
      {/* Free-text title for custom type */}
      {isCustom && (
        <input
          value={line.cost_label ?? ""}
          onChange={e => onChange({ ...line, cost_label: e.target.value })}
          placeholder="Escriu el títol de la categoria…"
          className={`${si} w-full text-xs font-medium placeholder-[#D1D5DB]`}
          autoFocus
        />
      )}
    </div>
  );
}

function CommLayerRow({ layer, onChange, onRemove }: { layer: CommissionLayer; onChange: (l: CommissionLayer) => void; onRemove: () => void }) {
  const si = "text-xs px-2 py-1.5 rounded-lg border border-[#E5E7EB] focus:outline-none focus:ring-1 focus:ring-[#8E0E1A] bg-white";
  return (
    <div className="grid grid-cols-12 gap-1.5 items-center">
      <input value={layer.layer_name} onChange={e => onChange({ ...layer, layer_name: e.target.value })} placeholder="Nom capa" className={`${si} col-span-3`} />
      <select value={layer.commission_type} onChange={e => onChange({ ...layer, commission_type: e.target.value as CommType })} className={`${si} col-span-2`}>
        <option value="percent">%</option>
        <option value="amount">€ fix</option>
      </select>
      <div className="col-span-2 relative">
        <input type="number" step="0.5" min="0" value={layer.value} onChange={e => onChange({ ...layer, value: parseFloat(e.target.value) || 0 })} className={`${si} w-full pr-5 text-right`} />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#9CA3AF]">{layer.commission_type === "percent" ? "%" : "€"}</span>
      </div>
      <select value={layer.base} onChange={e => onChange({ ...layer, base: e.target.value as CommBase })} className={`${si} col-span-3`}>
        <option value="net_sale_price">Sobre preu net</option>
        <option value="post_production">Post-producció</option>
        <option value="post_previous_layers">Post-capes ant.</option>
      </select>
      <button onClick={() => onChange({ ...layer, active: !layer.active })} className={`col-span-1 p-1.5 rounded-lg text-[10px] font-bold transition-colors ${layer.active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
        {layer.active ? "ON" : "OFF"}
      </button>
      <button onClick={onRemove} className="col-span-1 p-1.5 rounded-lg text-[#D1D5DB] hover:text-red-500 hover:bg-red-50 transition-colors">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h8M4.5 3V2h3v1M5 5.5v4M7 5.5v4M2.5 3l.5 7h6l.5-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
    </div>
  );
}

function PromoRow({ promo, onChange, onRemove }: { promo: Promotion; onChange: (p: Promotion) => void; onRemove: () => void }) {
  const si = "text-xs px-2 py-1.5 rounded-lg border border-[#E5E7EB] focus:outline-none focus:ring-1 focus:ring-[#8E0E1A] bg-white";
  return (
    <div className="space-y-1.5 p-3 rounded-xl bg-[#FAFAFA] border border-[#F3F4F6]">
      <div className="flex items-center gap-2">
        <select value={promo.promo_type} onChange={e => onChange({ ...promo, promo_type: e.target.value as PromoType })} className={`${si} flex-1`}>
          <option value="discount_pct">% Descompte</option>
          <option value="free_units">X+Y Unitats gratuïtes</option>
          <option value="intro_offer">Oferta introducció (€/ud)</option>
          <option value="marketing_support">Suport màrqueting (€/ud)</option>
          <option value="bonus_stock">Bonus stock (%)</option>
        </select>
        <input value={promo.label} onChange={e => onChange({ ...promo, label: e.target.value })} placeholder="Nom" className={`${si} flex-1`} />
        <button onClick={() => onChange({ ...promo, active: !promo.active })} className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${promo.active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
          {promo.active ? "ON" : "OFF"}
        </button>
        <button onClick={onRemove} className="p-1.5 rounded-lg text-[#D1D5DB] hover:text-red-500 hover:bg-red-50 transition-colors">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h8M4.5 3V2h3v1M5 5.5v4M7 5.5v4M2.5 3l.5 7h6l.5-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      {/* Promo-specific fields */}
      {(promo.promo_type === "discount_pct" || promo.promo_type === "bonus_stock") && (
        <div className="relative w-32">
          <input type="number" step="0.5" min="0" max="100" value={promo.discount_pct ?? ""} onChange={e => onChange({ ...promo, discount_pct: parseFloat(e.target.value) || 0 })} className={`${si} w-full pr-6 text-right`} placeholder="%" />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#9CA3AF]">%</span>
        </div>
      )}
      {promo.promo_type === "free_units" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#6B7280]">Per cada</span>
          <input type="number" min="1" value={promo.free_units_paid ?? 3} onChange={e => onChange({ ...promo, free_units_paid: parseInt(e.target.value) || 1 })} className={`${si} w-16 text-center`} />
          <span className="text-xs text-[#6B7280]">pagades, afegir</span>
          <input type="number" min="1" value={promo.free_units_free ?? 1} onChange={e => onChange({ ...promo, free_units_free: parseInt(e.target.value) || 1 })} className={`${si} w-16 text-center`} />
          <span className="text-xs text-[#6B7280]">gratuïtes</span>
        </div>
      )}
      {(promo.promo_type === "intro_offer" || promo.promo_type === "marketing_support") && (
        <div className="relative w-32">
          <input type="number" step="0.01" min="0" value={promo.flat_amount ?? ""} onChange={e => onChange({ ...promo, flat_amount: parseFloat(e.target.value) || 0 })} className={`${si} w-full pr-6 text-right`} placeholder="€/ud" />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#9CA3AF]">€</span>
        </div>
      )}
    </div>
  );
}
