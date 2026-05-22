import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Brúixola — Quadre de Comandament" };

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

function varBadge(cur: number, prev: number) {
  if (prev === 0) return null;
  const pct = ((cur - prev) / prev) * 100;
  const up = pct >= 0;
  return { pct, up, label: `${up ? "+" : ""}${pct.toFixed(1)}%` };
}

type RawLine = { sku?: string; units?: number | string; name?: string };
type Inv = {
  id: string; contact_id: string; date: string;
  raw: { subtotal?: number; products?: RawLine[]; items?: RawLine[] } | null;
};

export default async function BruixolaPage() {
  const profile = await getProfile();
  if (!profile || (profile.role !== "OWNER" && profile.role !== "CONSIGLIERE")) notFound();

  const admin = createAdminClient();
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();

  const windowStart = new Date(Date.UTC(year, month - 5, 1)).toISOString();
  const { end: windowEnd } = monthRange(year, month);

  const [invRes, creditRes, profilesRes, cdRes, simRes] = await Promise.all([
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
    admin.from("profiles")
      .select("id, full_name, delegate_name, role")
      .in("role", ["DELEGATE", "KOL", "COORDINATOR"]),
    admin.from("contact_delegates").select("contact_id, delegate_id"),
    admin.from("economic_simulations")
      .select("net_sale_price, estructura_pct, logistics_pct, production_cost_lines")
      .eq("is_performance_reference", true)
      .maybeSingle(),
  ]);

  const cancelled = new Set(
    ((creditRes.data ?? []) as { from_invoice_id: string | null }[])
      .map(r => r.from_invoice_id).filter(Boolean) as string[]
  );
  const allInv   = ((invRes.data ?? []) as Inv[]).filter(i => !cancelled.has(i.id));
  const profiles = (profilesRes.data ?? []) as { id: string; full_name: string; delegate_name: string | null }[];
  const cdRows   = (cdRes.data ?? []) as { contact_id: string; delegate_id: string }[];

  const sim = simRes.data as {
    net_sale_price?: number; estructura_pct?: number; logistics_pct?: number;
    production_cost_lines?: { unit_cost?: number }[];
  } | null;
  const costPerUnit = sim
    ? (sim.production_cost_lines ?? []).reduce((s, l) => s + (l.unit_cost ?? 0), 0)
    : 0;

  function agg(start: string, end: string) {
    const invs = allInv.filter(i => i.date >= start && i.date <= end);
    let revenue = 0, totalUnits = 0;
    const byProduct: Record<string, number> = {};
    const byDelegate: Record<string, number> = {};
    const clients = new Set<string>();
    for (const inv of invs) {
      revenue += inv.raw?.subtotal ?? 0;
      clients.add(inv.contact_id);
      const lines = inv.raw?.products ?? inv.raw?.items ?? [];
      const delegId = cdRows.find(r => r.contact_id === inv.contact_id)?.delegate_id;
      for (const l of lines) {
        const u = Number(l.units ?? 0);
        totalUnits += u;
        const key = normName((l.name ?? l.sku ?? "").trim());
        if (key) byProduct[key] = (byProduct[key] ?? 0) + u;
        if (delegId) byDelegate[delegId] = (byDelegate[delegId] ?? 0) + u;
      }
    }
    return { revenue, units: totalUnits, clients: clients.size, byProduct, byDelegate, count: invs.length };
  }

  const { start: curStart, end: curEnd }   = monthRange(year, month);
  const { start: prevStart, end: prevEnd } = monthRange(year, month - 1);
  const cur  = agg(curStart, curEnd);
  const prev = agg(prevStart, prevEnd);

  const grossMargin = costPerUnit > 0
    ? cur.revenue - cur.units * costPerUnit
      - cur.revenue * ((sim?.estructura_pct ?? 0) / 100)
      - cur.revenue * ((sim?.logistics_pct  ?? 0) / 100)
    : null;

  const history = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 5 + i, 1));
    const y = d.getUTCFullYear(), m = d.getUTCMonth();
    const { start, end } = monthRange(y, m);
    const data = agg(start, end);
    return { label: MONTH_LABELS[m], year: y, revenue: data.revenue, units: data.units };
  });

  const maxRev = Math.max(...history.map(h => h.revenue), 1);

  const topProducts = Object.entries(cur.byProduct)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([name, units]) => ({ name, units }));

  const topDelegates = Object.entries(cur.byDelegate)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([id, units]) => {
      const p = profiles.find(p => p.id === id);
      return { name: p?.delegate_name ?? p?.full_name ?? "—", units };
    });

  const kpis = [
    {
      label: "Facturació",
      value: fmtEur(cur.revenue),
      badge: varBadge(cur.revenue, prev.revenue),
      sub: `Ant: ${fmtEur(prev.revenue)}`,
    },
    {
      label: "Unitats venudes",
      value: cur.units.toLocaleString("es-ES"),
      badge: varBadge(cur.units, prev.units),
      sub: `Ant: ${prev.units.toLocaleString("es-ES")}`,
    },
    {
      label: "Clients actius",
      value: cur.clients.toLocaleString("es-ES"),
      badge: varBadge(cur.clients, prev.clients),
      sub: `Ant: ${prev.clients}`,
    },
    {
      label: "Marge brut est.",
      value: grossMargin !== null ? fmtEur(grossMargin) : "—",
      badge: grossMargin !== null && prev.revenue > 0
        ? varBadge(
            grossMargin,
            prev.revenue - prev.units * costPerUnit
              - prev.revenue * ((sim?.estructura_pct ?? 0) / 100)
              - prev.revenue * ((sim?.logistics_pct  ?? 0) / 100)
          )
        : null,
      sub: grossMargin !== null
        ? `${((grossMargin / cur.revenue) * 100).toFixed(1)}% s/ facturació`
        : "Configura costos",
    },
  ];

  const curLabel = `${MONTH_LABELS[month]} ${year}`;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Brúixola</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Quadre de Comandament · {curLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { href: "/dashboard/bruixola/rendiment",    label: "Rendiment" },
            { href: "/dashboard/bruixola/financier",    label: "Motor Econòmic" },
            { href: "/dashboard/bruixola/rendibilitat", label: "Rendibilitat" },
          ].map(n => (
            <Link key={n.href} href={n.href}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#8E0E1A] border border-[#FECACA] hover:bg-[#FEF2F2] transition-colors">
              {n.label} →
            </Link>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-xl p-4 border border-[#E5E7EB]">
            <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-1.5">{k.label}</p>
            <p className="text-[22px] font-bold text-[#111827] leading-none">{k.value}</p>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {k.badge && (
                <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${k.badge.up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                  {k.badge.label}
                </span>
              )}
              <span className="text-[11px] text-[#9CA3AF]">{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Bar charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 border border-[#E5E7EB]">
          <h2 className="text-[13px] font-semibold text-[#374151] mb-4">Facturació 6 mesos</h2>
          <div className="flex items-end gap-1.5 h-28">
            {history.map((h, i) => {
              const pct = (h.revenue / maxRev) * 100;
              const isLast = i === history.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-[#9CA3AF] truncate w-full text-center">
                    {h.revenue > 0 ? fmtEur(h.revenue).replace(/\s*€/, "€") : ""}
                  </span>
                  <div className="w-full rounded-t-md"
                    style={{
                      height: `${Math.max(pct, 3)}%`,
                      backgroundColor: isLast ? "#8E0E1A" : "#FECACA",
                      minHeight: 3,
                    }} />
                  <span className={`text-[9px] ${isLast ? "font-bold text-[#8E0E1A]" : "text-[#9CA3AF]"}`}>
                    {h.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#E5E7EB]">
          <h2 className="text-[13px] font-semibold text-[#374151] mb-4">Unitats venudes 6 mesos</h2>
          {(() => {
            const maxU = Math.max(...history.map(h => h.units), 1);
            return (
              <div className="flex items-end gap-1.5 h-28">
                {history.map((h, i) => {
                  const pct = (h.units / maxU) * 100;
                  const isLast = i === history.length - 1;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[9px] text-[#9CA3AF]">{h.units > 0 ? h.units : ""}</span>
                      <div className="w-full rounded-t-md"
                        style={{
                          height: `${Math.max(pct, 3)}%`,
                          backgroundColor: isLast ? "#8E0E1A" : "#FECACA",
                          minHeight: 3,
                        }} />
                      <span className={`text-[9px] ${isLast ? "font-bold text-[#8E0E1A]" : "text-[#9CA3AF]"}`}>
                        {h.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top products */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#F3F4F6] flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-[#374151]">Top productes · {curLabel}</h2>
            <Link href="/dashboard/bruixola/rendibilitat" className="text-[11px] text-[#8E0E1A] hover:underline">
              Detall →
            </Link>
          </div>
          <div className="divide-y divide-[#F9FAFB]">
            {topProducts.length === 0
              ? <p className="px-5 py-4 text-[12px] text-[#9CA3AF]">Sense dades</p>
              : topProducts.map((p, i) => {
                  const barW = Math.round((p.units / (topProducts[0]?.units || 1)) * 100);
                  return (
                    <div key={i} className="px-5 py-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-semibold text-[#9CA3AF] shrink-0 w-4">{i + 1}</span>
                          <span className="text-[12px] text-[#374151] font-medium capitalize truncate">{p.name}</span>
                        </div>
                        <span className="text-[12px] font-semibold text-[#111827] shrink-0 ml-2">{p.units} ut</span>
                      </div>
                      <div className="ml-6 h-1 bg-[#F3F4F6] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${barW}%`, backgroundColor: "#8E0E1A" }} />
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>

        {/* Top delegates */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#F3F4F6] flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-[#374151]">Top delegats · {curLabel}</h2>
            <Link href="/dashboard/bruixola/rendiment" className="text-[11px] text-[#8E0E1A] hover:underline">
              Detall →
            </Link>
          </div>
          <div className="divide-y divide-[#F9FAFB]">
            {topDelegates.length === 0
              ? <p className="px-5 py-4 text-[12px] text-[#9CA3AF]">Sense dades</p>
              : topDelegates.map((d, i) => {
                  const barW = Math.round((d.units / (topDelegates[0]?.units || 1)) * 100);
                  const medal = i < 3 ? ["🥇","🥈","🥉"][i] : null;
                  return (
                    <div key={i} className="px-5 py-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[13px] shrink-0 w-5 text-center leading-none">
                            {medal ?? <span className="text-[10px] text-[#9CA3AF]">{i + 1}</span>}
                          </span>
                          <span className="text-[12px] text-[#374151] font-medium truncate">{d.name}</span>
                        </div>
                        <span className="text-[12px] font-semibold text-[#111827] shrink-0 ml-2">{d.units} ut</span>
                      </div>
                      <div className="ml-7 h-1 bg-[#F3F4F6] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${barW}%`, backgroundColor: "#8E0E1A" }} />
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      </div>
    </div>
  );
}
