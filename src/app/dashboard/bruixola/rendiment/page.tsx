import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Brúixola — Rendiment Delegats" };

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

type RawLine = { sku?: string; units?: number | string; name?: string };
type Inv = {
  id: string; contact_id: string; date: string;
  raw: { subtotal?: number; products?: RawLine[]; items?: RawLine[] } | null;
};

export default async function RendimentPage() {
  const profile = await getProfile();
  if (!profile || (profile.role !== "OWNER" && profile.role !== "CONSIGLIERE")) notFound();

  const admin = createAdminClient();
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();

  const { start: curStart, end: curEnd }   = monthRange(year, month);
  const { start: prevStart, end: prevEnd } = monthRange(year, month - 1);
  const windowStart = prevStart;

  const [invRes, creditRes, profilesRes, cdRes] = await Promise.all([
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
    admin.from("profiles")
      .select("id, full_name, delegate_name, role, is_kol, is_coordinator")
      .in("role", ["DELEGATE", "KOL", "COORDINATOR"]),
    admin.from("contact_delegates").select("contact_id, delegate_id"),
  ]);

  const cancelled = new Set(
    ((creditRes.data ?? []) as { from_invoice_id: string | null }[])
      .map(r => r.from_invoice_id).filter(Boolean) as string[]
  );
  const allInv   = ((invRes.data ?? []) as Inv[]).filter(i => !cancelled.has(i.id));
  const profiles = (profilesRes.data ?? []) as {
    id: string; full_name: string; delegate_name: string | null; role: string;
    is_kol: boolean; is_coordinator: boolean;
  }[];
  const cdRows = (cdRes.data ?? []) as { contact_id: string; delegate_id: string }[];

  function aggByDelegate(start: string, end: string) {
    const invs = allInv.filter(i => i.date >= start && i.date <= end);
    const byDeleg: Record<string, { units: number; revenue: number; clients: Set<string> }> = {};
    for (const inv of invs) {
      const delegId = cdRows.find(r => r.contact_id === inv.contact_id)?.delegate_id;
      if (!delegId) continue;
      if (!byDeleg[delegId]) byDeleg[delegId] = { units: 0, revenue: 0, clients: new Set() };
      byDeleg[delegId].revenue += inv.raw?.subtotal ?? 0;
      byDeleg[delegId].clients.add(inv.contact_id);
      const lines = inv.raw?.products ?? inv.raw?.items ?? [];
      for (const l of lines) byDeleg[delegId].units += Number(l.units ?? 0);
    }
    return byDeleg;
  }

  const curData  = aggByDelegate(curStart, curEnd);
  const prevData = aggByDelegate(prevStart, prevEnd);

  const allDelegateIds = new Set([...Object.keys(curData), ...Object.keys(prevData)]);
  const rows = [...allDelegateIds].map(id => {
    const p = profiles.find(p => p.id === id);
    const cur  = curData[id]  ?? { units: 0, revenue: 0, clients: new Set() };
    const prev = prevData[id] ?? { units: 0, revenue: 0, clients: new Set() };
    const unitVar = prev.units > 0 ? ((cur.units - prev.units) / prev.units * 100) : null;
    return {
      id,
      name: p?.delegate_name ?? p?.full_name ?? "—",
      role: p?.role ?? "DELEGATE",
      isKol: p?.is_kol ?? false,
      isCoord: p?.is_coordinator ?? false,
      curUnits: cur.units,
      curRevenue: cur.revenue,
      curClients: cur.clients.size,
      prevUnits: prev.units,
      unitVar,
    };
  }).sort((a, b) => b.curUnits - a.curUnits);

  const curLabel  = `${MONTH_LABELS[month]} ${year}`;
  const prevLabel = `${MONTH_LABELS[month > 0 ? month - 1 : 11]} ${month === 0 ? year - 1 : year}`;

  const noSales = rows.filter(r => r.curUnits === 0 && r.prevUnits > 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/bruixola" className="text-[12px] text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors">
            ← Brúixola
          </Link>
          <h1 className="text-2xl font-bold text-[#111827] mt-0.5">Rendiment Delegats</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">{curLabel} vs {prevLabel}</p>
        </div>
      </div>

      {/* Alert: delegates without sales */}
      {noSales.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3.5">
          <p className="text-[12px] font-semibold text-amber-800 mb-1">
            ⚠️ {noSales.length} delegat{noSales.length > 1 ? "s" : ""} amb vendes el mes anterior però 0 ut aquest mes:
          </p>
          <p className="text-[12px] text-amber-700">{noSales.map(r => r.name).join(" · ")}</p>
        </div>
      )}

      {/* Rankings table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#F3F4F6]">
          <h2 className="text-[13px] font-semibold text-[#374151]">
            Rànquing per unitats venudes · {curLabel}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">
                <th className="px-5 py-2.5 text-left">#</th>
                <th className="px-3 py-2.5 text-left">Delegat</th>
                <th className="px-3 py-2.5 text-right">Ut {curLabel}</th>
                <th className="px-3 py-2.5 text-right">vs {prevLabel}</th>
                <th className="px-3 py-2.5 text-right">Facturació</th>
                <th className="px-3 py-2.5 text-right">Clients</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F9FAFB]">
              {rows.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-6 text-center text-[#9CA3AF]">Sense dades</td></tr>
              )}
              {rows.map((r, i) => {
                const medal = i < 3 ? ["🥇","🥈","🥉"][i] : null;
                const varClass = r.unitVar === null ? "" : r.unitVar >= 0 ? "text-emerald-600" : "text-red-600";
                const badge = r.role === "KOL" || r.isKol ? "KOL"
                  : r.role === "COORDINATOR" || r.isCoord ? "COORD" : null;
                return (
                  <tr key={r.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-5 py-3 text-center w-10">
                      {medal ? <span className="text-[15px]">{medal}</span>
                        : <span className="text-[11px] text-[#9CA3AF]">{i + 1}</span>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#111827]">{r.name}</span>
                        {badge && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FEF2F2] text-[#8E0E1A]">
                            {badge}
                          </span>
                        )}
                      </div>
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
                    <td className="px-3 py-3 text-right text-[#6B7280]">
                      {r.curRevenue > 0 ? fmtEur(r.curRevenue) : "—"}
                    </td>
                    <td className="px-3 py-3 text-right text-[#6B7280]">
                      {r.curClients > 0 ? r.curClients : "—"}
                    </td>
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
