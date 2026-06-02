"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { saveProductPrice } from "@/app/actions/price-calculator";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string; name: string; sku: string | null;
  price: number | null; cost: number | null; purchase_price: number | null;
}
interface Config {
  margen_tienda_pct: number; margen_distribuidor_pct: number;
  iva_pct: number; units_per_lot: number;
}

// ─── Core chain calculator ────────────────────────────────────────────────────

function chain(pvp: number, cost: number, mt: number, md: number, iva: number) {
  if (pvp <= 0 || cost < 0) return null;
  const margenTiendaE = pvp * (mt / 100);
  const pvl           = pvp - margenTiendaE;
  const margenDelE    = pvl * (md / 100);
  const pvd           = pvl - margenDelE;
  const margenBrut    = pvd - cost;
  const margenBrutPct = pvd > 0 ? (margenBrut / pvd) * 100 : 0;
  const pvpConIva     = pvp * (1 + iva / 100);
  const margenOnline  = pvp - cost;
  const margenOnlinePct = pvp > 0 ? (margenOnline / pvp) * 100 : 0;
  return { pvp, margenTiendaE, pvl, margenDelE, pvd, margenBrut, margenBrutPct, pvpConIva, margenOnline, margenOnlinePct };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtE = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);
const fmtP = (n: number) => `${n.toFixed(1)}%`;

function MargeBadge({ pct }: { pct: number }) {
  const cls = pct >= 30 ? "bg-emerald-50 text-emerald-700" : pct >= 15 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700";
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cls}`}>{fmtP(pct)}</span>;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ProductPricingClient({
  product, config, globalLanding, savedRow,
}: {
  product: Product;
  config: Config;
  globalLanding: number;
  savedRow: { pvp_sin_iva: number | null; purchase_cost_override: number | null; landing_cost_override: number | null } | null;
}) {
  // ── State ──────────────────────────────────────────────────────────────────
  const initPurchase = savedRow?.purchase_cost_override ?? Number(product.cost ?? product.purchase_price ?? 0);
  const initLandingOvr = savedRow?.landing_cost_override ?? null;
  const initPvp = savedRow?.pvp_sin_iva ?? Number(product.price ?? 0);

  const [purchase,    setPurchase]    = useState(initPurchase);
  const [landingOvr,  setLandingOvr]  = useState<number | null>(initLandingOvr);
  const [pvp,         setPvp]         = useState(initPvp);
  const [mt,          setMt]          = useState(config.margen_tienda_pct);
  const [md,          setMd]          = useState(config.margen_distribuidor_pct);
  const [iva,         setIva]         = useState(config.iva_pct);
  const [targetMargin, setTargetMargin] = useState(20); // target PVD margin %
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const effectiveLanding = landingOvr !== null ? landingOvr : globalLanding;
  const totalCost        = purchase + effectiveLanding;

  // ── Calculations ───────────────────────────────────────────────────────────

  const currentChain = useMemo(() => chain(pvp, totalCost, mt, md, iva), [pvp, totalCost, mt, md, iva]);

  // Break-even: minimum PVP where PVD = totalCost (margin = 0)
  // PVD = PVP * (1 - mt/100) * (1 - md/100)
  // PVD = totalCost → PVP_min = totalCost / ((1-mt/100) * (1-md/100))
  const factor       = (1 - mt / 100) * (1 - md / 100);
  const pvpBreakEven = factor > 0 ? totalCost / factor : 0;

  // Minimum with target margin: PVD = totalCost / (1 - targetMargin/100)
  const pvpTargetMin = factor > 0 && targetMargin < 100
    ? (totalCost / (1 - targetMargin / 100)) / factor
    : 0;

  // Sensitivity table: from pvpBreakEven to pvpBreakEven * 2.5 in 10 steps
  const sensitivityRows = useMemo(() => {
    if (pvpBreakEven <= 0) return [];
    const lo = pvpBreakEven * 0.9;
    const hi = Math.max(pvpBreakEven * 2.5, pvp * 1.3, 50);
    const steps = 12;
    const step  = (hi - lo) / steps;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const p = lo + step * i;
      const c = chain(p, totalCost, mt, md, iva);
      return { pvp: p, ...c };
    });
  }, [pvpBreakEven, pvp, totalCost, mt, md, iva]);

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    await saveProductPrice(product.id, pvp || null, purchase || null, landingOvr);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const inp = "w-full text-sm px-3 py-2 rounded-xl border border-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A] bg-white tabular-nums";

  return (
    <div className="max-w-6xl mx-auto px-5 py-6 space-y-8">

      {/* Breadcrumb + header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/dashboard/preus" className="text-xs text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors">← Cálculo Precios</Link>
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight mt-1">{product.name}</h1>
          {product.sku && <p className="text-[11px] font-mono text-[#9CA3AF] mt-0.5">{product.sku}</p>}
        </div>
        <button onClick={handleSave} disabled={saving}
          className={`text-sm font-bold px-5 py-2.5 rounded-xl transition-colors ${saved ? "bg-emerald-600 text-white" : "bg-[#8E0E1A] text-white hover:bg-[#7A0C17]"} disabled:opacity-50`}>
          {saving ? "Guardando…" : saved ? "✓ Guardado" : "Guardar cambios"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Col 1: Paràmetres ─────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Costos */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-4">
            <h2 className="text-sm font-bold text-[#0A0A0A]">Costos del producte</h2>

            <div>
              <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">Compra (cost proveïdor)</label>
              <div className="relative">
                <input type="number" step="0.01" min="0" value={purchase}
                  onChange={e => setPurchase(parseFloat(e.target.value) || 0)} className={`${inp} pr-7`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#9CA3AF]">€</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">
                Landing cost/ud
                {landingOvr === null && <span className="ml-1 text-[#9CA3AF] font-normal normal-case">(genèric: {fmtE(globalLanding)})</span>}
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input type="number" step="0.01" min="0"
                    value={landingOvr !== null ? landingOvr : globalLanding}
                    onChange={e => setLandingOvr(parseFloat(e.target.value) || 0)}
                    disabled={landingOvr === null}
                    className={`${inp} pr-7 ${landingOvr === null ? "opacity-50" : ""}`} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#9CA3AF]">€</span>
                </div>
                <button onClick={() => setLandingOvr(landingOvr !== null ? null : globalLanding)}
                  className={`shrink-0 text-[10px] font-bold px-2.5 py-2 rounded-xl border transition-colors ${landingOvr !== null ? "border-amber-300 bg-amber-50 text-amber-700" : "border-[#E5E7EB] text-[#9CA3AF] hover:text-[#374151]"}`}>
                  {landingOvr !== null ? "⚙ Custom" : "≡ Global"}
                </button>
              </div>
              {landingOvr === 0 && <p className="text-[10px] text-emerald-600 font-semibold mt-1">Producte ja a Espanya — sense cost d&apos;importació</p>}
            </div>

            <div className="pt-2 border-t border-[#F3F4F6]">
              <div className="flex justify-between text-sm">
                <span className="text-[#6B7280]">Coste total</span>
                <span className="font-bold text-red-600">{fmtE(totalCost)}</span>
              </div>
            </div>
          </div>

          {/* Marges */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-4">
            <h2 className="text-sm font-bold text-[#0A0A0A]">Marges i IVA</h2>
            {[
              { label: "Margen tienda", val: mt, set: setMt, suffix: "%" },
              { label: "Margen delegado", val: md, set: setMd, suffix: "%" },
              { label: "IVA", val: iva, set: setIva, suffix: "%" },
            ].map(({ label, val, set, suffix }) => (
              <div key={label}>
                <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">{label}</label>
                <div className="relative">
                  <input type="number" step="0.5" min="0" max="100" value={val}
                    onChange={e => set(parseFloat(e.target.value) || 0)} className={`${inp} pr-7`} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#9CA3AF]">{suffix}</span>
                </div>
              </div>
            ))}
          </div>

          {/* PVP input */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-3">
            <h2 className="text-sm font-bold text-[#0A0A0A]">PVP sin IVA</h2>
            <div className="relative">
              <input type="number" step="0.01" min="0" value={pvp || ""}
                onChange={e => setPvp(parseFloat(e.target.value) || 0)}
                placeholder="0.00" className={`${inp} pr-7 text-lg font-bold`} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#9CA3AF]">€</span>
            </div>
            {pvp > 0 && pvp < pvpBreakEven && (
              <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">
                ⛔ Per sota del break-even ({fmtE(pvpBreakEven)}). Marge negatiu.
              </p>
            )}
          </div>
        </div>

        {/* ── Col 2: Cadena de preus ────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Waterfall */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
            <h2 className="text-sm font-bold text-[#0A0A0A] mb-4">Cadena de preus</h2>

            {pvp > 0 && currentChain ? (
              <div className="space-y-2">
                {/* Visual waterfall */}
                {[
                  { label: "PVP sin IVA",        val: pvp,                          cls: "text-[#0A0A0A] font-bold", bar: "bg-[#0A0A0A]" },
                  { label: `− Margen tienda (${mt}%)`, val: -currentChain.margenTiendaE, cls: "text-[#6B7280]",        bar: "bg-[#F3F4F6]" },
                  { label: "= PVL",              val: currentChain.pvl,            cls: "text-[#374151] font-semibold", bar: "bg-slate-400", separator: true },
                  { label: `− Margen delegado (${md}%)`, val: -currentChain.margenDelE, cls: "text-violet-600",      bar: "bg-violet-300" },
                  { label: "= PVD",              val: currentChain.pvd,            cls: "text-blue-700 font-bold",  bar: "bg-blue-500",   separator: true },
                  { label: "− Coste total",       val: -totalCost,                  cls: "text-red-600",             bar: "bg-red-300" },
                  { label: "= Marge brut",        val: currentChain.margenBrut,     cls: currentChain.margenBrut >= 0 ? "text-emerald-600 font-bold" : "text-red-600 font-bold", bar: currentChain.margenBrut >= 0 ? "bg-emerald-500" : "bg-red-500", separator: true },
                  { label: "PVP con IVA",         val: currentChain.pvpConIva,      cls: "text-[#374151]",           bar: "bg-[#FECACA]" },
                ].map(({ label, val, cls, bar, separator }) => (
                  <div key={label} className={separator ? "pt-1 border-t border-[#F3F4F6]" : ""}>
                    <div className="flex items-center justify-between py-1">
                      <span className={`text-xs ${cls.includes("font") ? "" : "text-[#6B7280]"} ${cls.includes("text-") ? cls.split(" ").filter(c => c.startsWith("text-")).join(" ") : ""}`}>
                        {label}
                      </span>
                      <span className={`text-sm tabular-nums ${cls}`}>{fmtE(Math.abs(val))}</span>
                    </div>
                    {/* Mini bar */}
                    <div className="h-1.5 rounded-full bg-[#F3F4F6] mt-0.5 overflow-hidden">
                      <div className={`h-full rounded-full ${bar} transition-all duration-300`}
                        style={{ width: `${Math.min(Math.abs(val) / pvp * 100, 100)}%` }} />
                    </div>
                  </div>
                ))}

                <div className="pt-3 grid grid-cols-2 gap-2 border-t border-[#E5E7EB]">
                  <div className="bg-[#F9FAFB] rounded-xl p-2.5">
                    <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wider">% Marge brut</p>
                    <div className="mt-0.5"><MargeBadge pct={currentChain.margenBrutPct} /></div>
                  </div>
                  <div className="bg-[#F9FAFB] rounded-xl p-2.5">
                    <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wider">% Marge online</p>
                    <div className="mt-0.5"><MargeBadge pct={currentChain.margenOnlinePct} /></div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#9CA3AF] text-center py-4">Introdueix PVP sin IVA per veure la cadena</p>
            )}
          </div>

          {/* Break-even */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-4">
            <h2 className="text-sm font-bold text-[#0A0A0A]">Break-even i preu mínim</h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-100">
                <div>
                  <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Preu mínim absolut</p>
                  <p className="text-[10px] text-red-500 mt-0.5">Marge brut = 0€ (punt mort)</p>
                </div>
                <p className="text-xl font-bold text-red-700 tabular-nums">{fmtE(pvpBreakEven)}</p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100">
                <div>
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Preu mínim rentable</p>
                  <p className="text-[10px] text-amber-600 mt-0.5">
                    Amb {targetMargin}% de marge brut sobre PVD
                  </p>
                </div>
                <p className="text-xl font-bold text-amber-700 tabular-nums">{fmtE(pvpTargetMin)}</p>
              </div>

              {/* Target margin slider */}
              <div>
                <div className="flex justify-between text-[10px] text-[#9CA3AF] mb-1">
                  <span>Marge objectiu PVD</span>
                  <span className="font-bold text-amber-700">{targetMargin}%</span>
                </div>
                <input type="range" min={5} max={60} step={5} value={targetMargin}
                  onChange={e => setTargetMargin(Number(e.target.value))}
                  className="w-full accent-amber-500" />
                <div className="flex justify-between text-[9px] text-[#D1D5DB]">
                  <span>5%</span><span>60%</span>
                </div>
              </div>

              {pvp > 0 && (
                <div className={`flex items-center justify-between p-3 rounded-xl border ${pvp >= pvpTargetMin ? "bg-emerald-50 border-emerald-100" : pvp >= pvpBreakEven ? "bg-amber-50 border-amber-100" : "bg-red-50 border-red-100"}`}>
                  <p className={`text-xs font-semibold ${pvp >= pvpTargetMin ? "text-emerald-700" : pvp >= pvpBreakEven ? "text-amber-700" : "text-red-700"}`}>
                    {pvp >= pvpTargetMin ? `✓ PVP actual assoleix l'objectiu de ${targetMargin}%` : pvp >= pvpBreakEven ? `⚠ Rendible però sota l'objectiu (${targetMargin}%)` : "⛔ PVP actual per sota del break-even"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Col 3: Taula de sensibilitat ─────────────────────────────────── */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F3F4F6]">
              <h2 className="text-sm font-bold text-[#0A0A0A]">Anàlisi de sensibilitat</h2>
              <p className="text-[11px] text-[#6B7280] mt-0.5">Impacte al marge brut per cada PVP possible</p>
            </div>

            <div className="overflow-y-auto max-h-[520px]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">PVP sin IVA</th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-blue-600 uppercase tracking-wider">PVD</th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Marge €</th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Marge %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {sensitivityRows.map((row, i) => {
                    if (!row.pvd) return null;
                    const isBreakEven  = Math.abs(row.pvp - pvpBreakEven) < 0.5;
                    const isTarget     = Math.abs(row.pvp - pvpTargetMin) < 0.5;
                    const isCurrent    = pvp > 0 && Math.abs(row.pvp - pvp) < 0.5;
                    const isViable     = row.margenBrut !== undefined && row.margenBrut > 0;
                    const rowCls = isCurrent ? "bg-[#FEF2F2] font-semibold" : isTarget ? "bg-amber-50" : isBreakEven ? "bg-red-50" : "";

                    return (
                      <tr key={i} className={`${rowCls} hover:bg-[#F9FAFB] transition-colors cursor-pointer`}
                        onClick={() => setPvp(Math.round(row.pvp * 100) / 100)}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="tabular-nums font-semibold">{fmtE(row.pvp)}</span>
                            {isCurrent   && <span className="text-[8px] font-bold bg-[#8E0E1A] text-white px-1 rounded">ACTUAL</span>}
                            {isBreakEven && <span className="text-[8px] font-bold bg-red-600 text-white px-1 rounded">MÍNIM</span>}
                            {isTarget    && !isCurrent && <span className="text-[8px] font-bold bg-amber-500 text-white px-1 rounded">{targetMargin}%</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-blue-700">{fmtE(row.pvd ?? 0)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          <span className={isViable ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>
                            {fmtE(row.margenBrut ?? 0)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {row.margenBrutPct !== undefined && <MargeBadge pct={row.margenBrutPct} />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-2.5 bg-[#F9FAFB] border-t border-[#F3F4F6] text-[10px] text-[#9CA3AF]">
              Clica qualsevol fila per simular aquell PVP
            </div>
          </div>

          {/* Recommendation */}
          {pvpTargetMin > 0 && (
            <div className="bg-[#FEF2F2] rounded-2xl border border-[#FECACA] p-5">
              <p className="text-[10px] font-bold text-[#8E0E1A] uppercase tracking-wider mb-2">Recomanació de negociació</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Preu mínim absolut (sense benefici)</span>
                  <span className="font-bold text-red-700">{fmtE(pvpBreakEven)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Preu mínim rentable ({targetMargin}% marge)</span>
                  <span className="font-bold text-amber-700">{fmtE(pvpTargetMin)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Preu actual</span>
                  <span className={`font-bold ${pvp >= pvpTargetMin ? "text-emerald-700" : pvp >= pvpBreakEven ? "text-amber-700" : "text-red-700"}`}>{pvp > 0 ? fmtE(pvp) : "—"}</span>
                </div>
                {pvp > 0 && pvp >= pvpBreakEven && (
                  <div className="pt-2 border-t border-[#FECACA] text-[11px] text-[#6B7280]">
                    Pots negociar fins a <strong className="text-red-700">{fmtE(pvpBreakEven)}</strong> sense perdre diners.
                    Per mantenir {targetMargin}% de marge, el mínim és <strong className="text-amber-700">{fmtE(pvpTargetMin)}</strong>.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
