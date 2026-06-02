"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { saveProductPrice } from "@/app/actions/price-calculator";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product { id: string; name: string; sku: string | null; price: number | null; cost: number | null; purchase_price: number | null; }
interface Config   { margen_tienda_pct: number; margen_distribuidor_pct: number; iva_pct: number; units_per_lot: number; }

export interface CommLayer {
  name:   string;
  type:   "percent" | "amount";
  value:  number;
  base:   "pvp" | "pvl" | "pvd";  // on which price is this commission calculated
  active: boolean;
}

export type ChannelType = "online" | "professional" | "distribuidor" | "internacional" | "custom";

export interface PricingScenario {
  id:             string;
  name:           string;
  channel_type:   ChannelType;
  pvp:            number;       // consumer / list price
  mt_pct:         number;       // % tienda margin
  md_pct:         number;       // % distribuidor margin (0 if not applicable)
  iva_pct:        number;
  landing_override: number | null; // null = use global
  layers:         CommLayer[];
  notes:          string;
}

// ─── Chain calculation ────────────────────────────────────────────────────────

interface ChainResult {
  pvp: number;
  pvpPro:     number;   // PVP Professional = PVP − tienda%
  pvd:        number;   // PVD = PVP Pro − dist%
  pvpConIva:  number;
  layerBreakdown: { name: string; base: string; amount: number; pctOfPvp: number }[];
  totalComm:  number;
  netMargin:  number;
  netMarginPct: number;
  costTotal:  number;
}

function calcChain(s: PricingScenario, costTotal: number): ChainResult | null {
  const { pvp, mt_pct, md_pct, iva_pct, layers } = s;
  if (pvp <= 0) return null;

  const pvpPro   = pvp * (1 - mt_pct / 100);
  const pvd      = pvpPro * (1 - md_pct / 100);
  const pvpConIva = pvp * (1 + iva_pct / 100);

  const activeLayers = layers.filter(l => l.active);
  const layerBreakdown = activeLayers.map(l => {
    const base = l.base === "pvp" ? pvp : l.base === "pvl" ? pvpPro : pvd;
    const amount = l.type === "percent" ? base * l.value / 100 : l.value;
    return { name: l.name, base: l.base.toUpperCase(), amount, pctOfPvp: pvp > 0 ? amount / pvp * 100 : 0 };
  });
  const totalComm = layerBreakdown.reduce((s, l) => s + l.amount, 0);

  // Net = the effective price after channel margins − cost − commissions
  const effectiveNet = md_pct > 0 ? pvd : pvpPro;
  const netMargin    = effectiveNet - costTotal - totalComm;
  const netMarginPct = pvp > 0 ? netMargin / pvp * 100 : 0;

  return { pvp, pvpPro, pvd, pvpConIva, layerBreakdown, totalComm, netMargin, netMarginPct, costTotal };
}

function calcBreakEven(s: PricingScenario, costTotal: number) {
  const { mt_pct, md_pct, layers } = s;
  const activeLayers = layers.filter(l => l.active);

  // Commissions as fraction of their respective base
  // For PVP: P × (layer.value/100 if %)
  // For PVL: P × (1-mt%) × (layer.value/100 if %)
  // For PVD: P × (1-mt%) × (1-md%) × (layer.value/100 if %)

  let pvpCommPct  = 0, pvlCommPct  = 0, pvdCommPct  = 0;
  let fixedComm   = 0;
  for (const l of activeLayers) {
    if (l.type === "percent") {
      if (l.base === "pvp") pvpCommPct  += l.value / 100;
      if (l.base === "pvl") pvlCommPct  += l.value / 100;
      if (l.base === "pvd") pvdCommPct  += l.value / 100;
    } else {
      fixedComm += l.value;
    }
  }

  const f1 = 1 - mt_pct / 100;                // factor tienda
  const f2 = 1 - md_pct / 100;                // factor dist
  const effective = md_pct > 0 ? f1 * f2 : f1; // effective revenue fraction from PVP

  // net = P × effective - P × pvpCommPct - P × f1 × pvlCommPct - P × f1 × f2 × pvdCommPct - fixedComm - cost = 0
  const denominator = effective - pvpCommPct - f1 * pvlCommPct - f1 * f2 * pvdCommPct;
  const numerator   = costTotal + fixedComm;
  const pvpMin = denominator > 0.01 ? numerator / denominator : 0;
  return pvpMin;
}

// ─── Default scenarios ────────────────────────────────────────────────────────

function makeDefaults(config: Config, globalLanding: number, initPvp: number): PricingScenario[] {
  return [
    {
      id: "online", name: "Online (Shopify)", channel_type: "online",
      pvp: initPvp, mt_pct: 0, md_pct: 0, iva_pct: config.iva_pct,
      landing_override: null,
      layers: [
        { name: "KOL",      type: "percent", value: 3, base: "pvp", active: false },
        { name: "Afiliado", type: "percent", value: 5, base: "pvp", active: false },
      ],
      notes: "Venda directa al consumidor via Shopify o similar",
    },
    {
      id: "professional", name: "Professional", channel_type: "professional",
      pvp: initPvp, mt_pct: config.margen_tienda_pct, md_pct: 0, iva_pct: config.iva_pct,
      landing_override: null,
      layers: [
        { name: "Delegado",     type: "percent", value: config.margen_distribuidor_pct, base: "pvl", active: true },
        { name: "Recomendador", type: "percent", value: 3,  base: "pvp", active: false },
      ],
      notes: "Venda a professionals / botigues",
    },
    {
      id: "distribuidor", name: "Distribuïdor", channel_type: "distribuidor",
      pvp: initPvp, mt_pct: config.margen_tienda_pct, md_pct: config.margen_distribuidor_pct, iva_pct: config.iva_pct,
      landing_override: null,
      layers: [
        { name: "Delegado", type: "percent", value: config.margen_distribuidor_pct, base: "pvl", active: true },
        { name: "KOL",      type: "percent", value: 3, base: "pvp", active: false },
      ],
      notes: "Venda a distribuïdors (marge ampliat)",
    },
    {
      id: "internacional", name: "Internacional", channel_type: "internacional",
      pvp: initPvp, mt_pct: 0, md_pct: 0, iva_pct: 0,
      landing_override: 0,  // no import cost if already international
      layers: [
        { name: "Distribuïdor Local", type: "percent", value: 30, base: "pvp", active: true },
      ],
      notes: "Venda a mercats internacionals",
    },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtE = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);
const fmtP = (n: number) => `${n.toFixed(1)}%`;
function MargeBadge({ pct }: { pct: number }) {
  const cls = pct >= 25 ? "bg-emerald-50 text-emerald-700" : pct >= 10 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700";
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cls}`}>{fmtP(pct)}</span>;
}

const CHANNEL_COLOR: Record<ChannelType, string> = {
  online:         "bg-blue-50 text-blue-700 border-blue-200",
  professional:   "bg-teal-50 text-teal-700 border-teal-200",
  distribuidor:   "bg-violet-50 text-violet-700 border-violet-200",
  internacional:  "bg-amber-50 text-amber-700 border-amber-200",
  custom:         "bg-gray-100 text-gray-600 border-gray-200",
};
const CHANNEL_LABEL: Record<ChannelType, string> = {
  online: "Online", professional: "Professional", distribuidor: "Distribuïdor", internacional: "Internacional", custom: "Custom",
};
const DEFAULT_ACTORS = [
  { name: "Delegado",     value: 20, base: "pvl" as const },
  { name: "KOL",          value:  3, base: "pvp" as const },
  { name: "Recomendador", value:  3, base: "pvp" as const },
  { name: "Afiliado",     value:  5, base: "pvp" as const },
  { name: "Coordinador",  value:  3, base: "pvl" as const },
];

// ─── Commission layer row ─────────────────────────────────────────────────────

function CommRow({ layer, pvp, pvpPro, pvd, onChange, onRemove }: {
  layer: CommLayer; pvp: number; pvpPro: number; pvd: number;
  onChange: (l: CommLayer) => void; onRemove: () => void;
}) {
  const si = "text-xs px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white";
  const baseAmt = layer.base === "pvp" ? pvp : layer.base === "pvl" ? pvpPro : pvd;
  const amt = layer.active && pvp > 0 ? (layer.type === "percent" ? baseAmt * layer.value / 100 : layer.value) : null;

  return (
    <div className={`rounded-xl border p-3 space-y-2 ${layer.active ? "border-violet-200 bg-violet-50/20" : "border-[#F3F4F6] opacity-55"}`}>
      <div className="flex items-center gap-2">
        <input value={layer.name} onChange={e => onChange({ ...layer, name: e.target.value })}
          placeholder="Actor" className={`${si} flex-1 font-semibold`} />
        {amt !== null && <span className="text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-1 rounded-lg tabular-nums shrink-0">= {fmtE(amt)}</span>}
        <button onClick={() => onChange({ ...layer, active: !layer.active })}
          className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${layer.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
          {layer.active ? "Actiu" : "Off"}
        </button>
        <button onClick={onRemove} className="shrink-0 p-1.5 text-[#D1D5DB] hover:text-red-500 rounded-lg transition-colors">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h8M4.5 3V2h3v1M5 5.5v4M7 5.5v4M2.5 3l.5 7h6l.5-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {/* % / € */}
        <div className="flex rounded-lg border border-[#E5E7EB] overflow-hidden shrink-0">
          {(["percent", "amount"] as const).map(t => (
            <button key={t} onClick={() => onChange({ ...layer, type: t })}
              className={`px-3 py-1.5 text-xs font-bold transition-colors ${layer.type === t ? "bg-violet-600 text-white" : "bg-white text-[#6B7280] hover:bg-[#F3F4F6]"}`}>
              {t === "percent" ? "%" : "€"}
            </button>
          ))}
        </div>
        {/* Value */}
        <div className="relative w-24 shrink-0">
          <input type="number" step={layer.type === "percent" ? "0.5" : "0.01"} min="0"
            value={layer.value} onChange={e => onChange({ ...layer, value: parseFloat(e.target.value) || 0 })}
            className={`${si} w-full text-right pr-6 font-semibold`} />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[#9CA3AF]">{layer.type === "percent" ? "%" : "€"}</span>
        </div>
        {/* Base: PVP / PVP Pro / PVD */}
        <div className="flex rounded-lg border border-[#E5E7EB] overflow-hidden text-[11px] shrink-0">
          {(["pvp", "pvl", "pvd"] as const).map((b, i) => (
            <button key={b} onClick={() => onChange({ ...layer, base: b })}
              className={`px-2.5 py-1.5 font-semibold transition-colors border-r last:border-r-0 border-[#E5E7EB] ${layer.base === b ? "bg-blue-600 text-white" : "bg-white text-[#6B7280] hover:bg-[#F3F4F6]"}`}
              title={["Sobre PVP (preu consumidor)", "Sobre PVP Pro (PVP−tienda)", "Sobre PVD (PVP Pro−distribuïdor)"][i]}>
              {["PVP", "Pro", "PVD"][i]}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-[#9CA3AF] truncate">
          {layer.base === "pvp" ? `PVP ${pvp > 0 ? fmtE(pvp) : "—"}` : layer.base === "pvl" ? `PVP Pro ${pvpPro > 0 ? fmtE(pvpPro) : "—"}` : `PVD ${pvd > 0 ? fmtE(pvd) : "—"}`}
        </span>
      </div>
    </div>
  );
}

// ─── Scenario editor ──────────────────────────────────────────────────────────

function ScenarioEditor({
  scenario, costBase, globalLanding, targetMargin,
  onChange,
}: {
  scenario: PricingScenario;
  costBase: number;
  globalLanding: number;
  targetMargin: number;
  onChange: (s: PricingScenario) => void;
}) {
  const effectiveLanding = scenario.landing_override !== null ? scenario.landing_override : globalLanding;
  const costTotal        = costBase + effectiveLanding;
  const chain            = calcChain(scenario, costTotal);
  const pvpBreakEven     = calcBreakEven(scenario, costTotal);
  const factor           = (1 - scenario.mt_pct / 100) * (1 - scenario.md_pct / 100);
  const denomBE          = (factor > 0 ? factor : 1);
  // simple target min approximation
  const pvpTargetMin     = pvpBreakEven / (1 - targetMargin / 100) > pvpBreakEven ? pvpBreakEven / (1 - targetMargin / 100) : pvpBreakEven * 1.3;

  const pvpPro = scenario.pvp * (1 - scenario.mt_pct / 100);
  const pvd    = pvpPro * (1 - scenario.md_pct / 100);

  const si = "text-xs px-2.5 py-1.5 rounded-xl border border-[#E5E7EB] focus:outline-none focus:ring-1 focus:ring-[#8E0E1A] bg-white";

  // Sensitivity
  const sensRows = useMemo(() => {
    if (pvpBreakEven <= 0 || scenario.pvp <= 0) return [];
    const lo = pvpBreakEven * 0.85, hi = Math.max(pvpBreakEven * 2.2, scenario.pvp * 1.4, 50);
    return Array.from({ length: 12 }, (_, i) => {
      const p = lo + (hi - lo) * i / 11;
      const s2 = { ...scenario, pvp: p };
      return { pvp: p, chain: calcChain(s2, costTotal) };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pvpBreakEven, scenario.pvp, costTotal, scenario.mt_pct, scenario.md_pct, JSON.stringify(scenario.layers)]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

      {/* Col 1: Inputs */}
      <div className="space-y-4">
        {/* PVP input */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-3">
          <h3 className="text-sm font-bold text-[#0A0A0A]">Preu de venda</h3>
          <div>
            <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">PVP (consumidor / llista)</label>
            <div className="relative">
              <input type="number" step="0.01" min="0" value={scenario.pvp || ""}
                onChange={e => onChange({ ...scenario, pvp: parseFloat(e.target.value) || 0 })}
                className={`${si} w-full pr-7 text-lg font-bold`} placeholder="0.00" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#9CA3AF]">€</span>
            </div>
          </div>
          {scenario.mt_pct > 0 && (
            <div className="flex justify-between items-center py-1.5 px-3 bg-teal-50 rounded-xl border border-teal-100">
              <span className="text-[11px] font-bold text-teal-700">PVP Professional (PVL)</span>
              <span className="text-sm font-bold text-teal-700 tabular-nums">{pvpPro > 0 ? fmtE(pvpPro) : "—"}</span>
            </div>
          )}
          {scenario.md_pct > 0 && (
            <div className="flex justify-between items-center py-1.5 px-3 bg-violet-50 rounded-xl border border-violet-100">
              <span className="text-[11px] font-bold text-violet-700">PVD (Preu Venda Distribuïdor)</span>
              <span className="text-sm font-bold text-violet-700 tabular-nums">{pvd > 0 ? fmtE(pvd) : "—"}</span>
            </div>
          )}
        </div>

        {/* Margins for this channel */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-3">
          <h3 className="text-sm font-bold text-[#0A0A0A]">Marges del canal</h3>
          {[
            { label: "Marge tienda / canal", field: "mt_pct" as const, note: "→ PVP Professional" },
            { label: "Marge distribuïdor",   field: "md_pct" as const, note: "→ PVD" },
            { label: "IVA",                  field: "iva_pct" as const, note: "" },
          ].map(({ label, field, note }) => (
            <div key={field}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">{label}</label>
                {note && <span className="text-[10px] text-[#9CA3AF]">{note}</span>}
              </div>
              <div className="relative">
                <input type="number" step="0.5" min="0" max="100"
                  value={scenario[field]}
                  onChange={e => onChange({ ...scenario, [field]: parseFloat(e.target.value) || 0 })}
                  className={`${si} w-full pr-7`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#9CA3AF]">%</span>
              </div>
            </div>
          ))}
          {/* Landing override for this scenario */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Landing cost/ud</label>
              <button onClick={() => onChange({ ...scenario, landing_override: scenario.landing_override !== null ? null : globalLanding })}
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors ${scenario.landing_override !== null ? "border-amber-300 bg-amber-50 text-amber-700" : "border-[#E5E7EB] text-[#9CA3AF]"}`}>
                {scenario.landing_override !== null ? "Custom" : `Global (${fmtE(globalLanding)})`}
              </button>
            </div>
            {scenario.landing_override !== null && (
              <div className="relative">
                <input type="number" step="0.01" min="0" value={scenario.landing_override}
                  onChange={e => onChange({ ...scenario, landing_override: parseFloat(e.target.value) || 0 })}
                  className={`${si} w-full pr-7`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#9CA3AF]">€</span>
              </div>
            )}
          </div>
          <div className="pt-1 border-t border-[#F3F4F6] flex justify-between text-sm">
            <span className="text-[#6B7280]">Coste total</span>
            <span className="font-bold text-red-600">{fmtE(costTotal)}</span>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <textarea value={scenario.notes} rows={2}
            onChange={e => onChange({ ...scenario, notes: e.target.value })}
            placeholder="Notes sobre aquest canal…"
            className={`${si} w-full resize-none text-[11px] text-[#6B7280]`} />
        </div>
      </div>

      {/* Col 2: Commission layers */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0A0A0A]">Comissions per actor</h3>
              {chain && <p className="text-[11px] text-[#6B7280] mt-0.5">Total: <strong className="text-violet-700">{fmtE(chain.totalComm)}</strong>{scenario.pvp > 0 && ` (${fmtP(chain.totalComm / scenario.pvp * 100)} del PVP)`}</p>}
            </div>
          </div>

          <div className="space-y-2">
            {scenario.layers.map((l, idx) => (
              <CommRow key={idx} layer={l} pvp={scenario.pvp} pvpPro={pvpPro} pvd={pvd}
                onChange={nl => onChange({ ...scenario, layers: scenario.layers.map((x, i) => i === idx ? nl : x) })}
                onRemove={() => onChange({ ...scenario, layers: scenario.layers.filter((_, i) => i !== idx) })}
              />
            ))}
          </div>

          {/* Quick add */}
          <div>
            <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">Afegir actor</p>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_ACTORS.map(a => (
                <button key={a.name}
                  onClick={() => onChange({ ...scenario, layers: [...scenario.layers, { name: a.name, type: "percent", value: a.value, base: a.base, active: true }] })}
                  className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-[#F3F4F6] text-[#374151] hover:bg-violet-50 hover:text-violet-700 transition-colors">
                  + {a.name} <span className="text-[#9CA3AF]">({a.value}%)</span>
                </button>
              ))}
              <button onClick={() => onChange({ ...scenario, layers: [...scenario.layers, { name: "", type: "percent", value: 0, base: "pvp", active: true }] })}
                className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-dashed border-[#D1D5DB] text-[#9CA3AF] hover:border-violet-400 hover:text-violet-600 transition-colors">
                + Altre…
              </button>
            </div>
            <p className="text-[10px] text-[#D1D5DB] mt-2">PVP = preu consumidor · Pro = PVP−tienda% · PVD = PVP Pro−dist%</p>
          </div>
        </div>

        {/* Chain waterfall */}
        {chain && scenario.pvp > 0 && (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
            <h3 className="text-sm font-bold text-[#0A0A0A] mb-3">Cascada de preus</h3>
            <div className="space-y-1.5">
              {[
                { label: "PVP (consumidor)",  val: scenario.pvp, cls: "text-[#0A0A0A] font-bold", bar: "bg-[#0A0A0A]", w: 100 },
                ...(scenario.mt_pct > 0 ? [
                  { label: `− Marge tienda (${scenario.mt_pct}%)`, val: -(scenario.pvp * scenario.mt_pct / 100), cls: "text-[#9CA3AF]", bar: "bg-[#F3F4F6]", w: scenario.mt_pct },
                  { label: "= PVP Professional",   val: chain.pvpPro,  cls: "text-teal-700 font-semibold",   bar: "bg-teal-400",   w: chain.pvpPro / scenario.pvp * 100 },
                ] : []),
                ...(scenario.md_pct > 0 ? [
                  { label: `− Marge dist. (${scenario.md_pct}%)`, val: -(chain.pvpPro * scenario.md_pct / 100), cls: "text-[#9CA3AF]", bar: "bg-[#F3F4F6]", w: scenario.md_pct },
                  { label: "= PVD",                val: chain.pvd,     cls: "text-violet-700 font-semibold", bar: "bg-violet-400", w: chain.pvd / scenario.pvp * 100 },
                ] : []),
                ...chain.layerBreakdown.map(l => ({ label: `− ${l.name} (${l.base})`, val: -l.amount, cls: "text-violet-500", bar: "bg-violet-200", w: l.pctOfPvp })),
                { label: "− Coste total",     val: -costTotal,    cls: "text-red-600",    bar: "bg-red-200",    w: costTotal / scenario.pvp * 100 },
                { label: "= Marge net",        val: chain.netMargin, cls: chain.netMargin >= 0 ? "text-emerald-600 font-bold" : "text-red-600 font-bold", bar: chain.netMargin >= 0 ? "bg-emerald-500" : "bg-red-500", w: Math.abs(chain.netMargin) / scenario.pvp * 100 },
              ].map(({ label, val, cls, bar, w }, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs py-0.5">
                    <span className={cls.includes("text-") ? cls : "text-[#6B7280]"}>{label}</span>
                    <span className={`tabular-nums ${cls}`}>{fmtE(Math.abs(val))}</span>
                  </div>
                  <div className="h-1 rounded-full bg-[#F3F4F6] overflow-hidden">
                    <div className={`h-full ${bar} transition-all duration-200`} style={{ width: `${Math.min(Math.max(w, 0), 100)}%` }} />
                  </div>
                </div>
              ))}
              <div className="pt-2 grid grid-cols-2 gap-2 border-t border-[#F3F4F6]">
                <div className="bg-[#F9FAFB] rounded-xl p-2.5">
                  <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wider">% Marge net</p>
                  <div className="mt-0.5"><MargeBadge pct={chain.netMarginPct} /></div>
                </div>
                <div className="bg-[#F9FAFB] rounded-xl p-2.5">
                  <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wider">PVP + IVA</p>
                  <p className="text-sm font-bold tabular-nums mt-0.5">{fmtE(chain.pvpConIva)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Col 3: Break-even + sensitivity */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-3">
          <h3 className="text-sm font-bold text-[#0A0A0A]">Break-even</h3>
          <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-100">
            <div>
              <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Preu mínim (marge=0)</p>
            </div>
            <p className="text-xl font-bold text-red-700 tabular-nums">{pvpBreakEven > 0 ? fmtE(pvpBreakEven) : "—"}</p>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100">
            <div>
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Preu mínim rentable ({targetMargin}%)</p>
            </div>
            <p className="text-xl font-bold text-amber-700 tabular-nums">{pvpTargetMin > 0 ? fmtE(pvpTargetMin) : "—"}</p>
          </div>
          {scenario.pvp > 0 && (
            <div className={`p-2.5 rounded-xl text-xs font-semibold border ${scenario.pvp >= pvpTargetMin ? "bg-emerald-50 border-emerald-100 text-emerald-700" : scenario.pvp >= pvpBreakEven ? "bg-amber-50 border-amber-100 text-amber-700" : "bg-red-50 border-red-100 text-red-700"}`}>
              {scenario.pvp >= pvpTargetMin ? "✓ Assoleix l'objectiu de rendibilitat" : scenario.pvp >= pvpBreakEven ? `⚠ Rendible però sota l'objectiu (${targetMargin}%)` : "⛔ Per sota del break-even"}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#F3F4F6]">
            <h3 className="text-sm font-bold text-[#0A0A0A]">Sensibilitat</h3>
            <p className="text-[10px] text-[#9CA3AF] mt-0.5">Clica una fila per simular aquell PVP</p>
          </div>
          <div className="overflow-y-auto max-h-72">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">PVP</th>
                  {scenario.mt_pct > 0 && <th className="px-2 py-2.5 text-right text-[10px] font-semibold text-teal-600 uppercase">PVP Pro</th>}
                  {scenario.md_pct > 0 && <th className="px-2 py-2.5 text-right text-[10px] font-semibold text-violet-600 uppercase">PVD</th>}
                  <th className="px-2 py-2.5 text-right text-[10px] font-semibold text-[#9CA3AF] uppercase">Marge</th>
                  <th className="px-2 py-2.5 text-right text-[10px] font-semibold text-[#9CA3AF] uppercase">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {sensRows.map(({ pvp: p, chain: c }, i) => {
                  if (!c) return null;
                  const isCurrent  = scenario.pvp > 0 && Math.abs(p - scenario.pvp) < 0.5;
                  const isBreakEven = Math.abs(p - pvpBreakEven) < 0.5;
                  return (
                    <tr key={i} onClick={() => onChange({ ...scenario, pvp: Math.round(p * 100) / 100 })}
                      className={`cursor-pointer hover:bg-[#F9FAFB] transition-colors ${isCurrent ? "bg-[#FEF2F2]" : isBreakEven ? "bg-red-50" : ""}`}>
                      <td className="px-3 py-2 tabular-nums">
                        <span className={`font-semibold ${isCurrent ? "text-[#8E0E1A]" : ""}`}>{fmtE(p)}</span>
                        <div className="flex gap-0.5 mt-0.5">
                          {isCurrent   && <span className="text-[7px] font-bold bg-[#8E0E1A] text-white px-1 rounded">ACTUAL</span>}
                          {isBreakEven && <span className="text-[7px] font-bold bg-red-600 text-white px-1 rounded">MÍNIM</span>}
                        </div>
                      </td>
                      {scenario.mt_pct > 0 && <td className="px-2 py-2 text-right tabular-nums text-teal-700 text-[11px]">{fmtE(c.pvpPro)}</td>}
                      {scenario.md_pct > 0 && <td className="px-2 py-2 text-right tabular-nums text-violet-700 text-[11px]">{fmtE(c.pvd)}</td>}
                      <td className="px-2 py-2 text-right tabular-nums">
                        <span className={c.netMargin >= 0 ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>{fmtE(c.netMargin)}</span>
                      </td>
                      <td className="px-2 py-2 text-right"><MargeBadge pct={c.netMarginPct} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProductPricingClient({
  product, config, globalLanding, savedRow,
}: {
  product: Product;
  config: Config;
  globalLanding: number;
  savedRow: { pvp_sin_iva: number | null; purchase_cost_override: number | null; landing_cost_override: number | null; commission_layers_json: unknown | null; } | null;
}) {
  const initPurchase  = savedRow?.purchase_cost_override ?? Number(product.cost ?? product.purchase_price ?? 0);
  const initLandingOvr = savedRow?.landing_cost_override  ?? null;
  const initPvp       = savedRow?.pvp_sin_iva             ?? Number(product.price ?? 0);

  // Load saved scenarios or create defaults
  const initScenarios: PricingScenario[] = (() => {
    const raw = savedRow?.commission_layers_json;
    if (raw && typeof raw === "object" && "scenarios" in (raw as Record<string, unknown>)) {
      const s = (raw as { scenarios: unknown }).scenarios;
      if (Array.isArray(s) && s.length > 0) return s as PricingScenario[];
    }
    return makeDefaults(config, globalLanding, initPvp);
  })();

  const [purchase,       setPurchase]       = useState(initPurchase);
  const [landingOvr,     setLandingOvr]     = useState<number | null>(initLandingOvr);
  const [scenarios,      setScenarios]      = useState<PricingScenario[]>(initScenarios);
  const [activeTab,      setActiveTab]      = useState(0);
  const [targetMargin,   setTargetMargin]   = useState(20);
  const [saving,         setSaving]         = useState(false);
  const [saved,          setSaved]          = useState(false);

  const effectiveLanding = landingOvr !== null ? landingOvr : globalLanding;
  const costBase         = purchase + effectiveLanding;

  const updateScenario = useCallback((idx: number, s: PricingScenario) => {
    setScenarios(prev => prev.map((x, i) => i === idx ? s : x));
  }, []);

  const addScenario = useCallback(() => {
    const newS: PricingScenario = {
      id:   `custom-${Date.now()}`,
      name: "Nou canal",
      channel_type: "custom",
      pvp:  0, mt_pct: 0, md_pct: 0, iva_pct: config.iva_pct,
      landing_override: null, layers: [], notes: "",
    };
    setScenarios(prev => [...prev, newS]);
    setActiveTab(scenarios.length);
  }, [scenarios.length, config.iva_pct]);

  async function handleSave() {
    setSaving(true);
    const pvpForRow = scenarios[0]?.pvp ?? null;
    await saveProductPrice(product.id, pvpForRow, purchase || null, landingOvr, { scenarios });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const activeScenario = scenarios[activeTab] ?? scenarios[0];

  // Comparison row per scenario
  const comparisonRows = scenarios.map(s => {
    const costTotal = s.landing_override !== null ? purchase + s.landing_override : costBase;
    const chain = calcChain(s, costTotal);
    const be    = calcBreakEven(s, costTotal);
    return { scenario: s, chain, be };
  });

  return (
    <div className="max-w-[1440px] mx-auto px-5 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/dashboard/preus" className="text-xs text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors">← Cálculo Precios</Link>
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight mt-1">{product.name}</h1>
          {product.sku && <p className="text-[11px] font-mono text-[#9CA3AF] mt-0.5">{product.sku}</p>}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Global cost inputs */}
          <div className="flex items-center gap-2 bg-white rounded-xl border border-[#E5E7EB] px-3 py-2">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Compra</span>
            <input type="number" step="0.01" min="0" value={purchase}
              onChange={e => setPurchase(parseFloat(e.target.value) || 0)}
              className="w-20 text-xs text-right border-0 outline-none font-semibold tabular-nums" />
            <span className="text-[10px] text-[#9CA3AF]">€</span>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-[#E5E7EB] px-3 py-2">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Landing</span>
            <input type="number" step="0.01" min="0"
              value={landingOvr !== null ? landingOvr : globalLanding}
              disabled={landingOvr === null}
              onChange={e => setLandingOvr(parseFloat(e.target.value) || 0)}
              className={`w-20 text-xs text-right border-0 outline-none font-semibold tabular-nums ${landingOvr === null ? "opacity-50" : ""}`} />
            <button onClick={() => setLandingOvr(landingOvr !== null ? null : globalLanding)}
              className="text-[9px] font-bold text-[#9CA3AF] hover:text-[#374151]">
              {landingOvr !== null ? "C" : "G"}
            </button>
          </div>
          <span className="text-xs text-red-600 font-bold tabular-nums">Cost total: {fmtE(costBase)}</span>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-[#E5E7EB] px-3 py-1.5">
            <span className="text-[10px] text-[#9CA3AF]">Marge obj.</span>
            <input type="range" min={5} max={50} step={5} value={targetMargin}
              onChange={e => setTargetMargin(Number(e.target.value))} className="w-20 accent-amber-500" />
            <span className="text-[10px] font-bold text-amber-700">{targetMargin}%</span>
          </div>
          <button onClick={handleSave} disabled={saving}
            className={`text-sm font-bold px-5 py-2.5 rounded-xl transition-colors ${saved ? "bg-emerald-600 text-white" : "bg-[#8E0E1A] text-white hover:bg-[#7A0C17]"} disabled:opacity-50`}>
            {saving ? "Guardando…" : saved ? "✓ Guardado" : "Guardar tot"}
          </button>
        </div>
      </div>

      {/* Scenario tabs */}
      <div className="border-b border-[#E5E7EB]">
        <div className="flex gap-1 items-end flex-wrap">
          {scenarios.map((s, idx) => (
            <button key={s.id} onClick={() => setActiveTab(idx)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${activeTab === idx ? "border-[#8E0E1A] text-[#8E0E1A]" : "border-transparent text-[#6B7280] hover:text-[#374151]"}`}>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${CHANNEL_COLOR[s.channel_type]}`}>
                {CHANNEL_LABEL[s.channel_type]}
              </span>
              {s.name}
            </button>
          ))}
          <button onClick={addScenario}
            className="px-3 py-2.5 text-xs font-semibold text-[#9CA3AF] hover:text-[#8E0E1A] border-b-2 border-transparent transition-colors">
            + Canal
          </button>
        </div>
      </div>

      {/* Active scenario editor */}
      {activeScenario && (
        <ScenarioEditor
          scenario={activeScenario}
          costBase={costBase}
          globalLanding={effectiveLanding}
          targetMargin={targetMargin}
          onChange={s => updateScenario(activeTab, s)}
        />
      )}

      {/* Comparison table */}
      {scenarios.length > 1 && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#F3F4F6]">
            <h2 className="text-sm font-bold text-[#0A0A0A]">Comparativa de canals</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  {["Canal","PVP","PVP Pro","PVD","Comissions","Marge €","Marge %","Break-even"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {comparisonRows.map(({ scenario: s, chain: c, be }, i) => (
                  <tr key={s.id} onClick={() => setActiveTab(i)}
                    className={`cursor-pointer hover:bg-[#FAFAFA] transition-colors ${activeTab === i ? "bg-[#FEF9F9]" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${CHANNEL_COLOR[s.channel_type]}`}>{CHANNEL_LABEL[s.channel_type]}</span>
                        <span className="font-semibold">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums font-semibold">{s.pvp > 0 ? fmtE(s.pvp) : "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-teal-700">{c && s.mt_pct > 0 ? fmtE(c.pvpPro) : "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-violet-700">{c && s.md_pct > 0 ? fmtE(c.pvd) : "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-violet-600">{c ? fmtE(c.totalComm) : "—"}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {c && <span className={c.netMargin >= 0 ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>{fmtE(c.netMargin)}</span>}
                    </td>
                    <td className="px-4 py-3">{c && <MargeBadge pct={c.netMarginPct} />}</td>
                    <td className="px-4 py-3 tabular-nums text-red-600">{be > 0 ? fmtE(be) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
