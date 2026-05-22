import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Brúixola — Motor Econòmic" };

const MONTH_LABELS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function monthRange(year: number, month: number) {
  return {
    start: new Date(Date.UTC(year, month, 1)).toISOString(),
    end:   new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)).toISOString(),
  };
}

function fmtEur(n: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: number) {
  return `${n.toFixed(1)}%`;
}

type RawLine = { sku?: string; units?: number | string; name?: string };
type Inv = {
  id: string; contact_id: string; date: string;
  raw: { subtotal?: number; products?: RawLine[]; items?: RawLine[] } | null;
};

export default async function FinancierPage() {
  const profile = await getProfile();
  if (!profile || (profile.role !== "OWNER" && profile.role !== "CONSIGLIERE")) notFound();

  const admin = createAdminClient();
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();

  const windowStart = new Date(Date.UTC(year, month - 5, 1)).toISOString();
  const { end: windowEnd } = monthRange(year, month);

  const [invRes, creditRes, simRes] = await Promise.all([
    admin.from("holded_invoices")
      .select("id, contact_id, status, date, is_credit_note, from_invoice_id, raw")
      .in("status", [1, 2, 3])
      .eq("is_credit_note", false)
      .gte("date", windowStart)
      .lte("date", windowEnd),
    admin.from("holded_invoices")
      .select("from_invoice_id")
      .eq("is_credit_note", true)
      .not("from_invoice_id", "is", null),
    admin.from("economic_simulations")
      .select("net_sale_price, estructura_pct, logistics_pct, production_cost_lines")
      .eq("is_performance_reference", true)
      .maybeSingle(),
  ]);

  const cancelled = new Set(
    ((creditRes.data ?? []) as { from_invoice_id: string | null }[])
      .map(r => r.from_invoice_id).filter(Boolean) as string[]
  );
  const allInv = ((invRes.data ?? []) as Inv[]).filter(i => !cancelled.has(i.id));

  const sim = simRes.data as {
    net_sale_price?: number; estructura_pct?: number; logistics_pct?: number;
    production_cost_lines?: { unit_cost?: number }[];
  } | null;
  const costPerUnit   = sim ? (sim.production_cost_lines ?? []).reduce((s, l) => s + (l.unit_cost ?? 0), 0) : 0;
  const estructuraPct = sim?.estructura_pct ?? 0;
  const logisticsPct  = sim?.logistics_pct  ?? 0;
  const hasCosts      = costPerUnit > 0;

  function aggMonth(start: string, end: string) {
    const invs = allInv.filter(i => i.date >= start && i.date <= end);
    let revenue = 0, units = 0;
    for (const inv of invs) {
      revenue += inv.raw?.subtotal ?? 0;
      const lines = inv.raw?.products ?? inv.raw?.items ?? [];
      for (const l of lines) units += Number(l.units ?? 0);
    }
    const cogs      = costPerUnit * units;
    const estructura = revenue * (estructuraPct / 100);
    const logistics  = revenue * (logisticsPct  / 100);
    const grossMargin = revenue - cogs - estructura - logistics;
    return { revenue, units, cogs, estructura, logistics, grossMargin, count: invs.length };
  }

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 5 + i, 1));
    const y = d.getUTCFullYear(), m = d.getUTCMonth();
    const { start, end } = monthRange(y, m);
    const data = aggMonth(start, end);
    return { label: `${MONTH_LABELS[m]} ${y}`, shortLabel: MONTH_LABELS[m], ...data };
  });

  // Forecast: weighted average last 3 months (weights 1,2,3)
  const last3  = months.slice(-3);
  const wSum   = 1 + 2 + 3;
  const fRev   = (last3[0].revenue + last3[1].revenue * 2 + last3[2].revenue * 3) / wSum;
  const fUnits = Math.round((last3[0].units + last3[1].units * 2 + last3[2].units * 3) / wSum);
  const fCogs  = costPerUnit * fUnits;
  const fEstr  = fRev * (estructuraPct / 100);
  const fLog   = fRev * (logisticsPct  / 100);
  const fGross = fRev - fCogs - fEstr - fLog;

  const nextMonth = (month + 1) % 12;
  const nextYear  = month === 11 ? year + 1 : year;
  const forecastLabel = `${MONTH_LABELS[nextMonth]} ${nextYear}`;

  const cur = months[months.length - 1];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard/bruixola" className="text-[12px] text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors">
          ← Brúixola
        </Link>
        <h1 className="text-2xl font-bold text-[#111827] mt-0.5">Motor Econòmic</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">P&amp;L simplificat · últims 6 mesos</p>
      </div>

      {!hasCosts && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3.5">
          <p className="text-[12px] text-amber-800">
            ⚠️ Sense dades de costos configurades. El marge brut no es pot calcular.
            Configura la simulació econòmica per veure el P&amp;L complet.
          </p>
        </div>
      )}

      {/* P&L table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#F3F4F6]">
          <h2 className="text-[13px] font-semibold text-[#374151]">Compte de resultats simplificat</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-[10px] text-[#9CA3AF] uppercase tracking-wide bg-[#F9FAFB]">
                <th className="px-5 py-2.5 text-left w-36">Concepte</th>
                {months.map(m => (
                  <th key={m.label} className="px-3 py-2.5 text-right">{m.shortLabel}</th>
                ))}
                <th className="px-3 py-2.5 text-right text-[#8E0E1A]">Prev. {MONTH_LABELS[nextMonth]}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F9FAFB]">
              {[
                {
                  label: "Ingressos bruts",
                  vals: months.map(m => m.revenue),
                  forecast: fRev,
                  bold: true,
                },
                ...(hasCosts ? [
                  {
                    label: `(−) Cost producte`,
                    vals: months.map(m => -m.cogs),
                    forecast: -fCogs,
                    bold: false,
                    dim: true,
                  },
                  {
                    label: `(−) Estructura ${estructuraPct}%`,
                    vals: months.map(m => -m.estructura),
                    forecast: -fEstr,
                    bold: false,
                    dim: true,
                  },
                  {
                    label: `(−) Logística ${logisticsPct}%`,
                    vals: months.map(m => -m.logistics),
                    forecast: -fLog,
                    bold: false,
                    dim: true,
                  },
                  {
                    label: "= Marge brut",
                    vals: months.map(m => m.grossMargin),
                    forecast: fGross,
                    bold: true,
                    highlight: true,
                  },
                ] : []),
                {
                  label: "Factures",
                  vals: months.map(m => m.count),
                  forecast: null,
                  bold: false,
                  dim: true,
                  isCount: true,
                },
                {
                  label: "Unitats",
                  vals: months.map(m => m.units),
                  forecast: fUnits,
                  bold: false,
                  dim: true,
                  isCount: true,
                },
              ].map((row, ri) => (
                <tr key={ri} className={row.highlight ? "bg-[#FEF2F2]" : ""}>
                  <td className={`px-5 py-2.5 ${row.bold ? "font-semibold text-[#111827]" : "text-[#6B7280]"}`}>
                    {row.label}
                  </td>
                  {row.vals.map((v, vi) => {
                    const isLast = vi === row.vals.length - 1;
                    const isNeg  = typeof v === "number" && v < 0;
                    return (
                      <td key={vi}
                        className={[
                          "px-3 py-2.5 text-right tabular-nums",
                          isLast ? "font-semibold" : "",
                          row.highlight ? "text-[#8E0E1A]" : isNeg ? "text-[#D1D5DB]" : "text-[#374151]",
                        ].join(" ")}>
                        {row.isCount
                          ? Number(v).toLocaleString("es-ES")
                          : fmtEur(Math.abs(Number(v)))}
                      </td>
                    );
                  })}
                  <td className={`px-3 py-2.5 text-right tabular-nums text-[#8E0E1A] ${row.bold ? "font-semibold" : "text-[#9CA3AF]"}`}>
                    {row.forecast !== null
                      ? row.isCount
                        ? Number(row.forecast).toLocaleString("es-ES")
                        : fmtEur(Math.abs(Number(row.forecast)))
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Margin % chart */}
      {hasCosts && (
        <div className="bg-white rounded-xl p-5 border border-[#E5E7EB]">
          <h2 className="text-[13px] font-semibold text-[#374151] mb-4">% Marge brut per mes</h2>
          <div className="flex items-end gap-2 h-24">
            {months.map((m, i) => {
              const pct = m.revenue > 0 ? (m.grossMargin / m.revenue) * 100 : 0;
              const isLast = i === months.length - 1;
              const isNeg  = pct < 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className={`text-[9px] font-medium ${isNeg ? "text-red-600" : "text-[#6B7280]"}`}>
                    {fmtPct(pct)}
                  </span>
                  <div className="w-full rounded-t-md"
                    style={{
                      height: `${Math.max(Math.abs(pct), 3)}%`,
                      backgroundColor: isNeg ? "#FCA5A5" : isLast ? "#8E0E1A" : "#FECACA",
                      minHeight: 3,
                    }} />
                  <span className={`text-[9px] ${isLast ? "font-bold text-[#8E0E1A]" : "text-[#9CA3AF]"}`}>
                    {m.shortLabel}
                  </span>
                </div>
              );
            })}
            <div className="flex-1 flex flex-col items-center gap-1 opacity-60">
              <span className="text-[9px] text-[#8E0E1A]">
                {fRev > 0 ? fmtPct((fGross / fRev) * 100) : "—"}
              </span>
              <div className="w-full rounded-t-md border-2 border-dashed border-[#8E0E1A]"
                style={{
                  height: `${Math.max(fRev > 0 ? Math.abs((fGross / fRev) * 100) : 3, 3)}%`,
                  minHeight: 3,
                  backgroundColor: "transparent",
                }} />
              <span className="text-[9px] text-[#8E0E1A] font-medium">{MONTH_LABELS[nextMonth]}</span>
            </div>
          </div>
        </div>
      )}

      {/* Forecast summary */}
      <div className="bg-[#FEF2F2] rounded-xl p-5 border border-[#FECACA]">
        <h2 className="text-[13px] font-semibold text-[#8E0E1A] mb-3">
          Previsió {forecastLabel} <span className="font-normal text-[#9CA3AF] text-[11px]">(mitjana ponderada 3 mesos)</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Facturació prev.", value: fmtEur(fRev) },
            { label: "Unitats prev.", value: fUnits.toLocaleString("es-ES") },
            { label: "Marge brut prev.", value: hasCosts ? fmtEur(fGross) : "—" },
            { label: "% Marge prev.", value: hasCosts && fRev > 0 ? fmtPct((fGross / fRev) * 100) : "—" },
          ].map(k => (
            <div key={k.label}>
              <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide mb-0.5">{k.label}</p>
              <p className="text-[18px] font-bold text-[#8E0E1A]">{k.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
