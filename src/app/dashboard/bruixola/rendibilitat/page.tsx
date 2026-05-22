import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Brúixola — Rendibilitat" };

const MONTH_LABELS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function monthRange(year: number, month: number) {
  return {
    start: new Date(Date.UTC(year, month, 1)).toISOString(),
    end:   new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)).toISOString(),
  };
}

function normName(s: string) {
  return s.trim().toLowerCase().replace(/\s*&\s*/g, " and ").replace(/\s+/g, " ");
}

function fmtEur(n: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

type RawLine = { sku?: string; units?: number | string; name?: string; price?: number | string };
type Inv = {
  id: string; contact_id: string; date: string;
  raw: { subtotal?: number; products?: RawLine[]; items?: RawLine[] } | null;
};

export default async function RendibilitatPage() {
  const profile = await getProfile();
  if (!profile || (profile.role !== "OWNER" && profile.role !== "CONSIGLIERE")) notFound();

  const admin = createAdminClient();
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();

  const { start: curStart, end: curEnd }   = monthRange(year, month);
  const { start: prevStart, end: prevEnd } = monthRange(year, month - 1);
  const windowStart = prevStart;

  const [invRes, creditRes, simRes] = await Promise.all([
    admin.from("holded_invoices")
      .select("id, contact_id, status, date, is_credit_note, from_invoice_id, raw")
      .in("status", [1, 2, 3])
      .eq("is_credit_note", false)
      .gte("date", windowStart)
      .lte("date", curEnd),
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

  function aggProducts(start: string, end: string) {
    const invs = allInv.filter(i => i.date >= start && i.date <= end);
    const byProd: Record<string, { displayName: string; units: number; revenue: number }> = {};
    for (const inv of invs) {
      const lines = inv.raw?.products ?? inv.raw?.items ?? [];
      for (const l of lines) {
        const u = Number(l.units ?? 0);
        const rawName = (l.name ?? l.sku ?? "").trim();
        const key = normName(rawName);
        if (!key) continue;
        if (!byProd[key]) byProd[key] = { displayName: rawName, units: 0, revenue: 0 };
        byProd[key].units  += u;
        // Estimate revenue per product line proportionally
        byProd[key].revenue += u * Number(l.price ?? 0);
      }
    }
    return byProd;
  }

  const curProds  = aggProducts(curStart, curEnd);
  const prevProds = aggProducts(prevStart, prevEnd);

  const allKeys = new Set([...Object.keys(curProds), ...Object.keys(prevProds)]);
  const rows = [...allKeys].map(key => {
    const cur  = curProds[key]  ?? { displayName: key, units: 0, revenue: 0 };
    const prev = prevProds[key] ?? { displayName: key, units: 0, revenue: 0 };
    const unitVar = prev.units > 0 ? ((cur.units - prev.units) / prev.units * 100) : null;
    const cogs = costPerUnit * cur.units;
    const netRevReduction = cogs
      + cur.revenue * (estructuraPct / 100)
      + cur.revenue * (logisticsPct  / 100);
    const grossMargin = hasCosts && cur.revenue > 0 ? cur.revenue - netRevReduction : null;
    const marginPct   = grossMargin !== null && cur.revenue > 0
      ? (grossMargin / cur.revenue) * 100 : null;

    return {
      key,
      name: cur.displayName || prev.displayName,
      curUnits: cur.units,
      prevUnits: prev.units,
      unitVar,
      grossMargin,
      marginPct,
    };
  }).sort((a, b) => b.curUnits - a.curUnits);

  // ABC classification by units
  const totalUnits = rows.reduce((s, r) => s + r.curUnits, 0) || 1;
  let cumulativeUnits = 0;
  const rowsWithABC = rows.map(r => {
    cumulativeUnits += r.curUnits;
    const cum = cumulativeUnits / totalUnits;
    const abc = cum <= 0.8 ? "A" : cum <= 0.95 ? "B" : "C";
    return { ...r, abc };
  });

  const curLabel  = `${MONTH_LABELS[month]} ${year}`;
  const prevLabel = `${MONTH_LABELS[month > 0 ? month - 1 : 11]}`;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard/bruixola" className="text-[12px] text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors">
          ← Brúixola
        </Link>
        <h1 className="text-2xl font-bold text-[#111827] mt-0.5">Rendibilitat per Producte</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">Anàlisi ABC · {curLabel} vs {prevLabel}</p>
      </div>

      {/* ABC legend */}
      <div className="flex gap-3">
        {[
          { label: "A", desc: "80% unitats", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
          { label: "B", desc: "15% unitats", cls: "bg-blue-50 text-blue-700 border-blue-200" },
          { label: "C", desc: "5% unitats",  cls: "bg-[#F9FAFB] text-[#9CA3AF] border-[#E5E7EB]" },
        ].map(c => (
          <div key={c.label} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium ${c.cls}`}>
            <span className="font-bold">{c.label}:</span> {c.desc}
          </div>
        ))}
        {!hasCosts && (
          <span className="text-[11px] text-[#9CA3AF] self-center ml-2">
            ⚠️ Sense costos configurats — el marge no es pot calcular
          </span>
        )}
      </div>

      {/* Products table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#F3F4F6]">
          <h2 className="text-[13px] font-semibold text-[#374151]">
            Productes per unitats · {curLabel}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-[10px] text-[#9CA3AF] uppercase tracking-wide bg-[#F9FAFB]">
                <th className="px-5 py-2.5 text-left">Producte</th>
                <th className="px-3 py-2.5 text-center w-10">ABC</th>
                <th className="px-3 py-2.5 text-right">Ut {curLabel}</th>
                <th className="px-3 py-2.5 text-right">vs {prevLabel}</th>
                {hasCosts && <th className="px-3 py-2.5 text-right">Marge brut est.</th>}
                {hasCosts && <th className="px-3 py-2.5 text-right">% Marge</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F9FAFB]">
              {rowsWithABC.length === 0 && (
                <tr>
                  <td colSpan={hasCosts ? 6 : 4} className="px-5 py-6 text-center text-[#9CA3AF]">
                    Sense dades
                  </td>
                </tr>
              )}
              {rowsWithABC.map((r, i) => {
                const abcCls = r.abc === "A"
                  ? "bg-emerald-50 text-emerald-700"
                  : r.abc === "B"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-[#F3F4F6] text-[#9CA3AF]";
                const varClass = r.unitVar === null ? "" : r.unitVar >= 0 ? "text-emerald-600" : "text-red-600";
                const marginCls = r.marginPct === null ? "" : r.marginPct >= 30 ? "text-emerald-600"
                  : r.marginPct >= 15 ? "text-blue-600"
                  : r.marginPct >= 0  ? "text-amber-600"
                  : "text-red-600";
                return (
                  <tr key={r.key} className={`hover:bg-[#F9FAFB] transition-colors ${r.curUnits === 0 ? "opacity-50" : ""}`}>
                    <td className="px-5 py-3 font-medium text-[#111827] capitalize max-w-[240px]">
                      <span className="truncate block">{r.name}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${abcCls}`}>
                        {r.abc}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-[#111827]">
                      {r.curUnits === 0
                        ? <span className="text-[#D1D5DB]">0</span>
                        : r.curUnits.toLocaleString("es-ES")}
                    </td>
                    <td className={`px-3 py-3 text-right font-medium ${varClass}`}>
                      {r.unitVar === null ? "—"
                        : `${r.unitVar >= 0 ? "▲" : "▼"}${Math.abs(r.unitVar).toFixed(0)}%`}
                    </td>
                    {hasCosts && (
                      <td className="px-3 py-3 text-right text-[#6B7280]">
                        {r.grossMargin !== null && r.curUnits > 0 ? fmtEur(r.grossMargin) : "—"}
                      </td>
                    )}
                    {hasCosts && (
                      <td className={`px-3 py-3 text-right font-medium ${marginCls}`}>
                        {r.marginPct !== null && r.curUnits > 0 ? `${r.marginPct.toFixed(1)}%` : "—"}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
