"use client";

import { useState, useCallback, useTransition } from "react";
import { saveConfig, saveLandingCost, deleteLandingCost, saveProductPrice } from "@/app/actions/price-calculator";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Config {
  id: number;
  margen_tienda_pct: number;
  margen_distribuidor_pct: number;
  iva_pct: number;
  units_per_lot: number;
}

interface LandingCost {
  id: number;
  concept: string;
  amount: number;
  is_per_unit: boolean;
  sort_order: number;
  notes: string | null;
}

interface Product {
  id: string;
  name: string;
  sku: string | null;
  price: number | null;
  cost: number | null;
  purchase_price: number | null;
}

interface PriceRow {
  product_id: string;
  pvp_sin_iva: number | null;
  purchase_cost_override: number | null;
  landing_cost_override: number | null;  // null = usa genèric; 0 = sense landing (ja a Espanya); >0 = personalitzat
}

// ─── Pricing chain calculator ─────────────────────────────────────────────────

function calcChain(pvp: number, cost: number, margenTienda: number, margenDist: number, iva: number) {
  if (!pvp || pvp <= 0) return null;
  const pvpSinIva     = pvp;
  const margenTiendaE = pvpSinIva * (margenTienda / 100);
  const pvl           = pvpSinIva - margenTiendaE;          // Precio Venta Libre
  const margenDelE    = pvl * (margenDist / 100);            // Margen Delegado €
  const pvd           = pvl - margenDelE;                    // Precio Venta Distribuidor
  const pvpConIva     = pvpSinIva * (1 + iva / 100);
  const margenBrut    = pvd - cost;                          // Brut sobre PVD
  const margenBrutPct = cost > 0 ? (margenBrut / pvd) * 100 : null;
  const margenOnline  = pvpSinIva - cost;
  const margenOnlinePct = pvpSinIva > 0 ? (margenOnline / pvpSinIva) * 100 : null;
  return { pvpSinIva, margenTiendaE, pvl, margenDelE, pvd, pvpConIva, margenBrut, margenBrutPct, margenOnline, margenOnlinePct };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtE  = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);
const fmtP  = (n: number) => `${n.toFixed(1)}%`;
const inp   = "w-full text-sm px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white tabular-nums";

// ─── Main component ───────────────────────────────────────────────────────────

export default function PriceCalculatorClient({
  initialConfig,
  initialLandingCosts,
  products,
  priceMap: initialPriceMap,
}: {
  initialConfig: Config;
  initialLandingCosts: LandingCost[];
  products: Product[];
  priceMap: Record<string, PriceRow>;
}) {
  // ── State ───────────────────────────────────────────────────────────────────
  const [config, setConfig]               = useState<Config>(initialConfig);
  const [landingCosts, setLandingCosts]   = useState<LandingCost[]>(initialLandingCosts);
  const [pvpOverrides, setPvpOverrides]       = useState<Record<string, number | null>>(() => {
    const m: Record<string, number | null> = {};
    for (const [k, v] of Object.entries(initialPriceMap)) m[k] = v.pvp_sin_iva;
    return m;
  });
  const [costOverrides, setCostOverrides]     = useState<Record<string, number | null>>(() => {
    const m: Record<string, number | null> = {};
    for (const [k, v] of Object.entries(initialPriceMap)) m[k] = v.purchase_cost_override;
    return m;
  });
  // null = usa landing genèric; 0 = sense landing (ja aquí); >0 = landing personalitzat
  const [landingOverrides, setLandingOverrides] = useState<Record<string, number | null>>(() => {
    const m: Record<string, number | null> = {};
    for (const [k, v] of Object.entries(initialPriceMap)) {
      if (v.landing_cost_override !== null) m[k] = v.landing_cost_override;
    }
    return m;
  });

  const [editingLanding, setEditingLanding] = useState<number | null>(null);
  const [addingLanding,  setAddingLanding]  = useState(false);
  const [savingConfig,   startSavingConfig]   = useTransition();
  const [savingProduct,  setSavingProduct]   = useState<string | null>(null);
  const [deletingId,     setDeletingId]      = useState<number | null>(null);

  // ── Landing cost calc ───────────────────────────────────────────────────────
  const lotCosts    = landingCosts.filter(l => !l.is_per_unit).reduce((s, l) => s + l.amount, 0);
  const perUnitBase = config.units_per_lot > 0 ? lotCosts / config.units_per_lot : 0;
  const perUnitDir  = landingCosts.filter(l => l.is_per_unit).reduce((s, l) => s + l.amount, 0);
  const landingPerUnit = perUnitBase + perUnitDir;

  const getProductCost = useCallback((p: Product) => {
    const override = costOverrides[p.id];
    if (override != null) return override;
    return Number(p.cost ?? p.purchase_price ?? 0);
  }, [costOverrides]);

  // Returns the effective landing cost for a product:
  // - null override → use global landing cost
  // - 0 override → 0 (product already in Spain, no import cost)
  // - >0 override → custom landing cost per unit
  const getProductLanding = useCallback((p: Product) => {
    const override = landingOverrides[p.id];
    if (override !== undefined && override !== null) return override;
    return landingPerUnit;
  }, [landingOverrides, landingPerUnit]);

  const getProductPvp = useCallback((p: Product) => {
    const override = pvpOverrides[p.id];
    if (override != null) return override;
    return Number(p.price ?? 0);
  }, [pvpOverrides]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleSaveConfig() {
    const fd = new FormData();
    fd.append("margen_tienda_pct",       String(config.margen_tienda_pct));
    fd.append("margen_distribuidor_pct", String(config.margen_distribuidor_pct));
    fd.append("iva_pct",                 String(config.iva_pct));
    fd.append("units_per_lot",           String(config.units_per_lot));
    startSavingConfig(async () => { await saveConfig(fd); });
  }

  async function handleSaveLanding(fd: FormData) {
    await saveLandingCost(fd);
    setEditingLanding(null);
    setAddingLanding(false);
    // re-fetch would need a router refresh; for now optimistic update via reload
    window.location.reload();
  }

  async function handleDeleteLanding(id: number) {
    setDeletingId(id);
    await deleteLandingCost(id);
    setLandingCosts(prev => prev.filter(l => l.id !== id));
    setDeletingId(null);
  }

  async function handleSaveProduct(productId: string) {
    setSavingProduct(productId);
    await saveProductPrice(
      productId,
      pvpOverrides[productId] ?? null,
      costOverrides[productId] ?? null,
      landingOverrides[productId] !== undefined ? landingOverrides[productId] : null,
    );
    setSavingProduct(null);
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const CfgNum = ({ field, label, suffix = "" }: { field: keyof Config; label: string; suffix?: string }) => (
    <div>
      <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">{label}</label>
      <div className="relative">
        <input type="number" step="0.1" min="0" max="100" value={config[field] as number}
          onChange={e => setConfig(prev => ({ ...prev, [field]: parseFloat(e.target.value) || 0 }))}
          className={`${inp} pr-6`} />
        {suffix && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[#9CA3AF]">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto px-5 py-6 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Cálculo de Precios</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">
          Cadena: Compra → Landing cost → PVD → PVL → PVP. Actualización en tiempo real.
        </p>
      </div>

      {/* Top row: Config + Landing costs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Config panel */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0A0A0A]">Configuración de márgenes</h2>
            <button onClick={handleSaveConfig} disabled={savingConfig}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {savingConfig ? "Guardando…" : "Guardar"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <CfgNum field="margen_tienda_pct"        label="Margen Tienda"        suffix="%" />
            <CfgNum field="margen_distribuidor_pct"  label="Margen Distribuidor"  suffix="%" />
            <CfgNum field="iva_pct"                  label="IVA"                  suffix="%" />
            <CfgNum field="units_per_lot"            label="Unidades / lot"        />
          </div>

          {/* Visual formula */}
          <div className="bg-[#F9FAFB] rounded-xl p-3 text-[11px] font-mono text-[#374151] space-y-0.5">
            <div className="flex justify-between"><span className="text-[#9CA3AF]">PVP sin IVA</span><span className="font-bold">INPUT ↓</span></div>
            <div className="flex justify-between"><span>− Margen tienda ({config.margen_tienda_pct}%)</span><span>→ <strong>PVL</strong></span></div>
            <div className="flex justify-between"><span>− Margen delegado ({config.margen_distribuidor_pct}%)</span><span>→ <strong>PVD</strong></span></div>
            <div className="flex justify-between"><span>× {(1 + config.iva_pct / 100).toFixed(2)}</span><span>→ <strong>PVP+IVA</strong></span></div>
          </div>
        </div>

        {/* Landing costs */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#0A0A0A]">Landing cost</h2>
              <p className="text-[11px] text-[#6B7280] mt-0.5">
                Lot: <strong>{fmtE(lotCosts)}</strong> ÷ {config.units_per_lot} ud = <strong>{fmtE(perUnitBase)}/ud</strong>
                {perUnitDir > 0 && <> + <strong>{fmtE(perUnitDir)}/ud</strong> manip.</>}
                <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                  = {fmtE(landingPerUnit)}/ud
                </span>
              </p>
            </div>
            <button onClick={() => { setAddingLanding(true); setEditingLanding(null); }}
              className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] transition-colors">
              + Añadir
            </button>
          </div>

          {/* Add form */}
          {addingLanding && (
            <LandingForm onSave={handleSaveLanding} onCancel={() => setAddingLanding(false)} />
          )}

          <div className="space-y-0.5 max-h-64 overflow-y-auto">
            {/* Per-lot costs */}
            <p className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wider px-1 pt-1">Costos del lot</p>
            {landingCosts.filter(l => !l.is_per_unit).map(l => (
              editingLanding === l.id
                ? <LandingForm key={l.id} initial={l} onSave={handleSaveLanding} onCancel={() => setEditingLanding(null)} />
                : (
                  <div key={l.id} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[#F9FAFB] group transition-colors">
                    <span className="flex-1 text-xs text-[#374151]">{l.concept}</span>
                    <span className="text-xs font-semibold tabular-nums text-[#0A0A0A]">{fmtE(l.amount)}</span>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                      <button onClick={() => setEditingLanding(l.id)} className="p-0.5 text-[#9CA3AF] hover:text-[#374151]">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 9.5l1.5-1.5 5.5-5.5L9.5 4 4 9.5 2 10.5z" strokeLinejoin="round"/><path d="M7.5 2.5l2 2" strokeLinecap="round"/></svg>
                      </button>
                      <button onClick={() => handleDeleteLanding(l.id)} disabled={deletingId === l.id} className="p-0.5 text-[#9CA3AF] hover:text-red-500 disabled:opacity-40">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h8M4.5 3V2h3v1M4.5 5.5v4M7.5 5.5v4M2.5 3l.5 7h6l.5-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </div>
                  </div>
                )
            ))}

            {/* Per-unit costs */}
            <p className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wider px-1 pt-2">Per unitat</p>
            {landingCosts.filter(l => l.is_per_unit).map(l => (
              editingLanding === l.id
                ? <LandingForm key={l.id} initial={l} onSave={handleSaveLanding} onCancel={() => setEditingLanding(null)} />
                : (
                  <div key={l.id} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[#F9FAFB] group transition-colors">
                    <span className="flex-1 text-xs text-[#374151]">{l.concept}</span>
                    <span className="text-xs font-semibold tabular-nums text-emerald-700">{fmtE(l.amount)}/ud</span>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                      <button onClick={() => setEditingLanding(l.id)} className="p-0.5 text-[#9CA3AF] hover:text-[#374151]">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 9.5l1.5-1.5 5.5-5.5L9.5 4 4 9.5 2 10.5z" strokeLinejoin="round"/><path d="M7.5 2.5l2 2" strokeLinecap="round"/></svg>
                      </button>
                      <button onClick={() => handleDeleteLanding(l.id)} disabled={deletingId === l.id} className="p-0.5 text-[#9CA3AF] hover:text-red-500 disabled:opacity-40">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h8M4.5 3V2h3v1M4.5 5.5v4M7.5 5.5v4M2.5 3l.5 7h6l.5-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </div>
                  </div>
                )
            ))}
          </div>
        </div>
      </div>

      {/* Products table */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F3F4F6]">
          <h2 className="text-sm font-bold text-[#0A0A0A]">Cadena de precios por SKU</h2>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Edita <strong>Compra</strong> o <strong>PVP sin IVA</strong> — toda la cadena se recalcula. Guarda para persistir.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                {[
                  { h: "Producto",          cls: "text-left px-4",  w: "min-w-[180px]" },
                  { h: "Compra",            cls: "text-right px-3", w: "w-24", edit: true },
                  { h: "Landing",           cls: "text-right px-3", w: "w-28", edit: true },
                  { h: "Coste total",       cls: "text-right px-3", w: "w-20", accent: "text-red-600" },
                  { h: "PVP sin IVA",       cls: "text-right px-3", w: "w-24", edit: true },
                  { h: "Margen tda.",       cls: "text-right px-3", w: "w-20" },
                  { h: "PVL",               cls: "text-right px-3", w: "w-20" },
                  { h: "Margen del.",       cls: "text-right px-3", w: "w-20", accent: "text-violet-600" },
                  { h: "PVD",               cls: "text-right px-3", w: "w-20", accent: "text-blue-700 font-bold" },
                  { h: "Marge brut",        cls: "text-right px-3", w: "w-20" },
                  { h: "% M.Brut",          cls: "text-right px-3", w: "w-16" },
                  { h: "PVP + IVA",         cls: "text-right px-3", w: "w-24", accent: "text-[#0A0A0A] font-bold" },
                  { h: "% M.Online",        cls: "text-right px-3", w: "w-16" },
                  { h: "",                  cls: "px-3",             w: "w-16" },
                ].map(({ h, cls, w, edit, accent }) => (
                  <th key={h} className={`py-2.5 text-[10px] font-semibold uppercase tracking-wider ${cls} ${w} ${accent ?? "text-[#9CA3AF]"}`}>
                    {edit ? <span className="border-b border-dashed border-emerald-400">{h}</span> : h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {products.map(p => {
                const purchaseCost     = getProductCost(p);
                const effectiveLanding = getProductLanding(p);
                const costTotal        = purchaseCost + effectiveLanding;
                const pvp              = getProductPvp(p);
                const chain            = calcChain(pvp, costTotal, config.margen_tienda_pct, config.margen_distribuidor_pct, config.iva_pct);
                const hasCustomLanding = landingOverrides[p.id] !== undefined && landingOverrides[p.id] !== null;
                const isDirty          = pvpOverrides[p.id] !== undefined || costOverrides[p.id] !== undefined || hasCustomLanding;

                return (
                  <tr key={p.id} className="hover:bg-[#FAFAFA] transition-colors group">
                    {/* Producto */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#0A0A0A]">{p.name}</p>
                      {p.sku && <p className="text-[10px] font-mono text-[#9CA3AF]">{p.sku}</p>}
                    </td>

                    {/* Compra (editable) */}
                    <td className="px-3 py-2">
                      <input type="number" step="0.01" min="0"
                        value={costOverrides[p.id] ?? purchaseCost}
                        onChange={e => setCostOverrides(prev => ({ ...prev, [p.id]: parseFloat(e.target.value) || 0 }))}
                        className="w-full text-xs text-right px-2 py-1 rounded-lg border border-emerald-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-emerald-50 tabular-nums" />
                    </td>

                    {/* Landing — toggle genèric/personalitzat */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        {hasCustomLanding ? (
                          // Custom landing input
                          <input type="number" step="0.01" min="0"
                            value={landingOverrides[p.id] ?? 0}
                            onChange={e => setLandingOverrides(prev => ({ ...prev, [p.id]: parseFloat(e.target.value) || 0 }))}
                            className="w-16 text-xs text-right px-1.5 py-1 rounded-lg border border-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-amber-50 tabular-nums"
                            title="Landing cost per unitat personalitzat (0 = ja a Espanya)"
                          />
                        ) : (
                          <span className="text-xs text-[#9CA3AF] tabular-nums w-16 text-right">{fmtE(landingPerUnit)}</span>
                        )}
                        <button
                          onClick={() => {
                            if (hasCustomLanding) {
                              // Reset to generic
                              setLandingOverrides(prev => { const n = { ...prev }; delete n[p.id]; return n; });
                            } else {
                              // Switch to custom (start with current generic value)
                              setLandingOverrides(prev => ({ ...prev, [p.id]: landingPerUnit }));
                            }
                          }}
                          title={hasCustomLanding ? "Usar landing genèric" : "Personalitzar landing per aquest SKU"}
                          className={`shrink-0 p-1 rounded text-[9px] font-bold transition-colors ${hasCustomLanding ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "text-[#D1D5DB] hover:text-[#9CA3AF]"}`}
                        >
                          {hasCustomLanding ? "⚙" : "≡"}
                        </button>
                      </div>
                      {hasCustomLanding && landingOverrides[p.id] === 0 && (
                        <p className="text-[9px] text-emerald-600 font-semibold mt-0.5">ja aquí</p>
                      )}
                    </td>

                    {/* Coste total */}
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-red-600">{fmtE(costTotal)}</td>

                    {/* PVP sin IVA (editable) */}
                    <td className="px-3 py-2">
                      <input type="number" step="0.01" min="0"
                        value={pvpOverrides[p.id] ?? (p.price ?? "")}
                        onChange={e => setPvpOverrides(prev => ({ ...prev, [p.id]: parseFloat(e.target.value) || 0 }))}
                        placeholder="—"
                        className="w-full text-xs text-right px-2 py-1 rounded-lg border border-blue-200 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-blue-50 tabular-nums" />
                    </td>

                    {chain ? (
                      <>
                        <td className="px-3 py-2 text-right tabular-nums text-[#6B7280]">{fmtE(chain.margenTiendaE)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-[#374151]">{fmtE(chain.pvl)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-violet-600 font-semibold">{fmtE(chain.margenDelE)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-blue-700 font-bold">{fmtE(chain.pvd)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          <span className={chain.margenBrut >= 0 ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>
                            {fmtE(chain.margenBrut)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {chain.margenBrutPct !== null && (
                            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${chain.margenBrutPct >= 30 ? "bg-emerald-50 text-emerald-700" : chain.margenBrutPct >= 15 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                              {fmtP(chain.margenBrutPct)}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-bold text-[#0A0A0A]">{fmtE(chain.pvpConIva)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {chain.margenOnlinePct !== null && (
                            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${chain.margenOnlinePct >= 50 ? "bg-emerald-50 text-emerald-700" : chain.margenOnlinePct >= 30 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                              {fmtP(chain.margenOnlinePct)}
                            </span>
                          )}
                        </td>
                      </>
                    ) : (
                      <td colSpan={8} className="px-3 py-2 text-center text-[#D1D5DB] text-xs">Introduce PVP sin IVA →</td>
                    )}

                    {/* Save button */}
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleSaveProduct(p.id)}
                        disabled={savingProduct === p.id}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors ${isDirty ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-[#F3F4F6] text-[#9CA3AF] opacity-0 group-hover:opacity-100"} disabled:opacity-40`}
                      >
                        {savingProduct === p.id ? "…" : "Guardar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap text-[11px] text-[#6B7280]">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200 inline-block" /> Campo editable (Compra)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-200 inline-block" /> Campo editable (PVP)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-200 inline-block" /> Marge ≥30% · Bon</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-100 border border-amber-200 inline-block" /> Marge 15–30% · Acceptable</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-100 border border-red-200 inline-block" /> Marge &lt;15% · Revisar</span>
      </div>
    </div>
  );
}

// ─── Landing cost form ────────────────────────────────────────────────────────

function LandingForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: { id: number; concept: string; amount: number; is_per_unit: boolean; notes: string | null };
  onSave: (fd: FormData) => void;
  onCancel: () => void;
}) {
  const inp2 = "text-xs px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white w-full";
  return (
    <form action={onSave} className="flex items-center gap-2 bg-[#F0FDF4] border border-emerald-200 rounded-lg px-2 py-2">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input name="concept" defaultValue={initial?.concept} required placeholder="Concepto" className={`${inp2} flex-1`} />
      <input name="amount"  type="number" step="0.01" defaultValue={initial?.amount} required placeholder="0.00" className={`${inp2} w-24`} />
      <select name="is_per_unit" defaultValue={String(initial?.is_per_unit ?? "false")} className={`${inp2} w-28`}>
        <option value="false">Por lot</option>
        <option value="true">Por unidad</option>
      </select>
      <button type="submit" className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 whitespace-nowrap shrink-0">
        {initial ? "Actualizar" : "Añadir"}
      </button>
      <button type="button" onClick={onCancel} className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] whitespace-nowrap shrink-0">
        ✕
      </button>
    </form>
  );
}
