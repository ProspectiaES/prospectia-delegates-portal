"use client";

import { useState } from "react";

export interface BreakEvenData {
  fixedMonthlyCosts: number;
  plannedMonthlyCosts: number;
  weightedMarginRate: number;
  productsWithCost: number;
  totalProducts: number;
  beRevenue: number;
  beRevenueWithPlanned: number;
}

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const fmtPct = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);

export default function BreakEvenSection({ data }: { data: BreakEvenData }) {
  const [extraCost, setExtraCost] = useState(0);

  const totalActive   = data.fixedMonthlyCosts + extraCost;
  const totalPlanned  = data.plannedMonthlyCosts + extraCost;
  const beActive      = data.weightedMarginRate > 0 ? totalActive / data.weightedMarginRate : 0;
  const bePlanned     = data.weightedMarginRate > 0 ? totalPlanned / data.weightedMarginRate : 0;

  const Gauge = ({ value, max, color }: { value: number; max: number; color: string }) => {
    const pct = Math.min(value / Math.max(max, 1), 1) * 100;
    return (
      <div className="w-full h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-bold text-[#0A0A0A]">Punt d&apos;equilibri (Break-even)</h2>
        <p className="text-xs text-[#6B7280] mt-0.5">
          Basat en {data.productsWithCost}/{data.totalProducts} SKUs amb cost definit.
          Marge net ponderat: <span className="font-semibold text-[#0A0A0A]">{fmtPct(data.weightedMarginRate)}</span>.
        </p>
      </div>

      {/* Break-even cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Estructura (active only) */}
        <div className="rounded-xl border border-[#E5E7EB] p-4 space-y-3 bg-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Break-even · Estructura</p>
              <p className="text-[10px] text-[#9CA3AF] mt-0.5">Costos actius</p>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#8E0E1A]">
              {fmtEuro(totalActive)}/mes
            </span>
          </div>
          <p className="text-2xl font-bold text-[#0A0A0A] tabular-nums">{fmtEuro(beActive)}</p>
          <p className="text-[11px] text-[#6B7280]">de facturació mensual necessaris</p>
          <Gauge value={beActive} max={beActive * 2} color="bg-[#8E0E1A]" />
        </div>

        {/* Operacional (active + planned) */}
        <div className="rounded-xl border border-[#E5E7EB] p-4 space-y-3 bg-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Break-even · Operacional</p>
              <p className="text-[10px] text-[#9CA3AF] mt-0.5">Actius + planificats</p>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
              {fmtEuro(totalPlanned)}/mes
            </span>
          </div>
          <p className="text-2xl font-bold text-[#0A0A0A] tabular-nums">{fmtEuro(bePlanned)}</p>
          <p className="text-[11px] text-[#6B7280]">de facturació mensual necessaris</p>
          <Gauge value={bePlanned} max={bePlanned * 2} color="bg-amber-400" />
        </div>
      </div>

      {/* Simulator */}
      <div className="rounded-xl border border-[#E5E7EB] p-4 bg-[#FAFAFA] space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[#374151]">Simulació: cost extra mensual</p>
          <span className="text-xs font-bold text-[#0A0A0A] tabular-nums">{fmtEuro(extraCost)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={5000}
          step={50}
          value={extraCost}
          onChange={e => setExtraCost(Number(e.target.value))}
          className="w-full accent-[#8E0E1A]"
        />
        <div className="flex items-center justify-between text-[10px] text-[#9CA3AF]">
          <span>+0 €</span>
          <span>+5.000 €</span>
        </div>
        {extraCost > 0 && (
          <div className="pt-1 border-t border-[#E5E7EB] grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-[#9CA3AF]">BE Estructura simulat</p>
              <p className="font-bold text-[#0A0A0A]">{fmtEuro(beActive)}</p>
            </div>
            <div>
              <p className="text-[#9CA3AF]">BE Operacional simulat</p>
              <p className="font-bold text-[#0A0A0A]">{fmtEuro(bePlanned)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Margin breakdown */}
      {data.weightedMarginRate > 0 && (
        <div className="rounded-xl border border-[#E5E7EB] overflow-hidden bg-white">
          <div className="px-4 py-3 border-b border-[#F3F4F6]">
            <p className="text-xs font-semibold text-[#374151]">Com s&apos;arriba al marge</p>
          </div>
          <div className="px-4 py-3 grid grid-cols-3 gap-4 text-center text-xs">
            <div>
              <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Marge brut</p>
              <p className="text-lg font-bold text-emerald-600 mt-1">{fmtPct(data.weightedMarginRate)}</p>
              <p className="text-[10px] text-[#9CA3AF]">sobre preu de venda</p>
            </div>
            <div>
              <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Costos actius</p>
              <p className="text-lg font-bold text-[#0A0A0A] mt-1">{fmtEuro(data.fixedMonthlyCosts)}</p>
              <p className="text-[10px] text-[#9CA3AF]">mensuals</p>
            </div>
            <div>
              <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Ingressos needed</p>
              <p className="text-lg font-bold text-[#8E0E1A] mt-1">{fmtEuro(data.beRevenue)}</p>
              <p className="text-[10px] text-[#9CA3AF]">per cobrir estructura</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
