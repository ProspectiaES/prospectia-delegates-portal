import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { MonthPicker } from "@/app/dashboard/delegados/[id]/MonthPicker";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const fmtPct = (n: number) =>
  `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

function monthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month, 1)).toISOString();
  const end   = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)).toISOString();
  return { start, end };
}

function prevMonth(year: number, month: number) {
  return month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 };
}

type CommType = "percent" | "amount";

function calcLine(units: number, price: number, discount: number, rate: number | null, type: CommType) {
  if (!rate) return 0;
  const net = units * price * (1 - discount / 100);
  return type === "amount" ? units * rate : (net * rate) / 100;
}

// ─── Signal ───────────────────────────────────────────────────────────────────

function signal(netContrib: number, activity: number, growth: number | null): "green" | "amber" | "red" {
  if (netContrib <= 0 && activity === 0) return "red";
  if (netContrib > 0 && activity >= 0.3 && (growth === null || growth >= 0)) return "green";
  if (netContrib > 0 || activity >= 0.15) return "amber";
  return "red";
}

const signalBadge: Record<"green" | "amber" | "red", { label: string; cls: string }> = {
  green: { label: "Rentable",  cls: "bg-green-50 text-green-700" },
  amber: { label: "Regular",   cls: "bg-amber-50  text-amber-700" },
  red:   { label: "Bajo",      cls: "bg-red-50    text-red-700"   },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductInfo {
  cost: number | null;
  commission_delegate: number | null; commission_delegate_type: CommType;
  commission_4: number | null;        commission_4_type: CommType;
  commission_5: number | null;        commission_5_type: CommType;
}

const AFFILIATE_RATE = 0.20;

interface RawLine { productId?: string; units?: number | string; price?: number | string; discount?: number | string }

interface DelegateRow {
  id: string; name: string; email: string | null; is_kol: boolean;
  totalClients: number; newClients: number; activeClients: number; activityRate: number;
  billedCurrent: number; billedPrev: number; invoiceCount: number;
  pendiente: number; vencido: number; growth: number | null;
  grossMargin: number;
  commDelegate: number; commKol: number; commAffiliate: number; commCoord: number;
  totalChain: number; netContribution: number;
  marginPct: number | null; costCoverage: number;
  sig: "green" | "amber" | "red";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function RendimientoPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const sp = await searchParams;
  const now = new Date();
  let pYear  = now.getFullYear();
  let pMonth = now.getMonth();

  if (sp.mes && /^\d{4}-\d{2}$/.test(sp.mes)) {
    const [y, m] = sp.mes.split("-").map(Number);
    pYear = y; pMonth = m - 1;
  }

  const mesStr       = `${pYear}-${String(pMonth + 1).padStart(2, "0")}`;
  const nowStr       = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const isCurrentMes = mesStr === nowStr;

  const { start: curStart, end: curEnd } = monthRange(pYear, pMonth);
  const { y: py, m: pm } = prevMonth(pYear, pMonth);
  const { start: prevStart, end: prevEnd } = monthRange(py, pm);

  const periodLabel = new Date(pYear, pMonth).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  const prevLabel   = new Date(py, pm).toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  const admin = createAdminClient();

  const [delegatesRes, cdRes, curInvRes, prevInvRes, pendRes, vencRes, productsRes, contactsRes] = await Promise.all([
    admin.from("profiles")
      .select("id, full_name, delegate_name, email, is_kol")
      .in("role", ["DELEGATE", "KOL", "COORDINATOR"])
      .order("full_name"),

    admin.from("contact_delegates")
      .select("delegate_id, contact_id, assigned_at"),

    // Paid — current period, with raw + subtotal for full chain calc
    admin.from("holded_invoices")
      .select("contact_id, total, subtotal, raw")
      .eq("status", 3).eq("is_credit_note", false)
      .gte("date_paid", curStart).lte("date_paid", curEnd),

    // Paid — previous period (totals only)
    admin.from("holded_invoices")
      .select("contact_id, total")
      .eq("status", 3).eq("is_credit_note", false)
      .gte("date_paid", prevStart).lte("date_paid", prevEnd),

    admin.from("holded_invoices").select("contact_id, total").eq("status", 1),
    admin.from("holded_invoices").select("contact_id, total").eq("status", 2),

    admin.from("holded_products")
      .select("id, cost, commission_delegate, commission_delegate_type, commission_4, commission_4_type, commission_5, commission_5_type"),

    // Contact chain metadata
    admin.from("holded_contacts")
      .select("id, kol_id, affiliate_id, coordinator_id"),
  ]);

  type CdRow    = { delegate_id: string; contact_id: string; assigned_at: string };
  type InvBasic = { contact_id: string; total: number };
  type InvRaw   = InvBasic & { subtotal: number | null; raw: Record<string, unknown> };

  const delegates  = (delegatesRes.data ?? []) as { id: string; full_name: string; delegate_name: string | null; email: string | null; is_kol: boolean }[];
  const cdRows     = (cdRes.data ?? []) as CdRow[];
  const curInvs    = (curInvRes.data  ?? []) as InvRaw[];
  const prevInvs   = (prevInvRes.data ?? []) as InvBasic[];
  const pendInvs   = (pendRes.data    ?? []) as InvBasic[];
  const vencInvs   = (vencRes.data    ?? []) as InvBasic[];

  type ContactMeta = { kol_id: string | null; affiliate_id: string | null; coordinator_id: string | null };
  const contactMeta: Record<string, ContactMeta> = {};
  for (const c of (contactsRes.data ?? []) as (ContactMeta & { id: string })[]) {
    contactMeta[c.id] = { kol_id: c.kol_id, affiliate_id: c.affiliate_id, coordinator_id: c.coordinator_id };
  }

  const productMap: Record<string, ProductInfo> = {};
  for (const p of (productsRes.data ?? []) as {
    id: string; cost: number | null;
    commission_delegate: number | null; commission_delegate_type: string;
    commission_4: number | null; commission_4_type: string;
    commission_5: number | null; commission_5_type: string;
  }[]) {
    productMap[p.id] = {
      cost: p.cost,
      commission_delegate: p.commission_delegate, commission_delegate_type: (p.commission_delegate_type ?? "percent") as CommType,
      commission_4: p.commission_4,               commission_4_type: (p.commission_4_type ?? "percent") as CommType,
      commission_5: p.commission_5,               commission_5_type: (p.commission_5_type ?? "percent") as CommType,
    };
  }

  // Per-contact aggregates — full chain: delegate + KOL + affiliate + coordinator
  type ContactAgg = {
    total: number; count: number; cogs: number; coveredRev: number;
    commDelegate: number; commKol: number; commAffiliate: number; commCoord: number;
  };
  const curAgg: Record<string, ContactAgg> = {};

  for (const inv of curInvs) {
    const cid  = inv.contact_id;
    const meta = contactMeta[cid] ?? { kol_id: null, affiliate_id: null, coordinator_id: null };
    if (!curAgg[cid]) curAgg[cid] = { total: 0, count: 0, cogs: 0, coveredRev: 0, commDelegate: 0, commKol: 0, commAffiliate: 0, commCoord: 0 };
    curAgg[cid].total += inv.total;
    curAgg[cid].count++;

    // Affiliate: flat 20% on subtotal (independent of product lines)
    if (meta.affiliate_id) {
      const base = inv.subtotal ?? inv.total;
      curAgg[cid].commAffiliate += base * AFFILIATE_RATE;
    }

    for (const rp of ((inv.raw?.products ?? []) as RawLine[])) {
      if (!rp.productId) continue;
      const prod = productMap[rp.productId];
      if (!prod) continue;
      const units    = Number(rp.units)    || 0;
      const price    = Number(rp.price)    || 0;
      const discount = Number(rp.discount) || 0;
      const isFoc    = price === 0;
      const lineNet  = isFoc ? 0 : units * price * (1 - discount / 100);

      if (prod.cost != null) {
        curAgg[cid].cogs       += units * prod.cost;
        curAgg[cid].coveredRev += lineNet;
      }

      if (!isFoc) {
        curAgg[cid].commDelegate += calcLine(units, price, discount, prod.commission_delegate, prod.commission_delegate_type);
        if (meta.kol_id)         curAgg[cid].commKol   += calcLine(units, price, discount, prod.commission_4, prod.commission_4_type);
        if (meta.coordinator_id) curAgg[cid].commCoord += calcLine(units, price, discount, prod.commission_5, prod.commission_5_type);
      }
    }
  }

  // Simple aggregates for prev/pend/venc
  function byContact(invs: InvBasic[]) {
    const m: Record<string, { total: number; count: number }> = {};
    for (const inv of invs) {
      if (!m[inv.contact_id]) m[inv.contact_id] = { total: 0, count: 0 };
      m[inv.contact_id].total += inv.total;
      m[inv.contact_id].count++;
    }
    return m;
  }
  const prevMap = byContact(prevInvs);
  const pendMap = byContact(pendInvs);
  const vencMap = byContact(vencInvs);

  // Build per-delegate index
  const delegateContacts: Record<string, Set<string>> = {};
  const newInPeriod:       Record<string, number>     = {};

  for (const cd of cdRows) {
    if (!delegateContacts[cd.delegate_id]) delegateContacts[cd.delegate_id] = new Set();
    delegateContacts[cd.delegate_id].add(cd.contact_id);
    if (cd.assigned_at >= curStart && cd.assigned_at <= curEnd) {
      newInPeriod[cd.delegate_id] = (newInPeriod[cd.delegate_id] ?? 0) + 1;
    }
  }

  const rows: DelegateRow[] = delegates.map((d) => {
    const contacts = delegateContacts[d.id] ?? new Set<string>();
    let billedCurrent = 0, billedPrev = 0, invoiceCount = 0, pendiente = 0, vencido = 0;
    let cogs = 0, coveredRev = 0;
    let commDelegate = 0, commKol = 0, commAffiliate = 0, commCoord = 0;
    const activeSet = new Set<string>();

    for (const cid of contacts) {
      const agg = curAgg[cid];
      if (agg) {
        billedCurrent += agg.total;
        invoiceCount  += agg.count;
        cogs          += agg.cogs;
        coveredRev    += agg.coveredRev;
        commDelegate  += agg.commDelegate;
        commKol       += agg.commKol;
        commAffiliate += agg.commAffiliate;
        commCoord     += agg.commCoord;
        activeSet.add(cid);
      }
      billedPrev += prevMap[cid]?.total ?? 0;
      pendiente  += pendMap[cid]?.total ?? 0;
      vencido    += vencMap[cid]?.total ?? 0;
    }

    const grossMargin     = coveredRev - cogs;
    const totalChain      = commDelegate + commKol + commAffiliate + commCoord;
    const netContribution = grossMargin - totalChain;
    const marginPct       = coveredRev > 0 ? (grossMargin / coveredRev) * 100 : null;
    const costCoverage    = billedCurrent > 0 ? (coveredRev / billedCurrent) * 100 : 0;

    const totalClients  = contacts.size;
    const activeClients = activeSet.size;
    const activityRate  = totalClients > 0 ? activeClients / totalClients : 0;
    const growth        = billedPrev > 0 ? ((billedCurrent - billedPrev) / billedPrev) * 100 : null;
    const sig           = signal(netContribution, activityRate, growth);

    return {
      id: d.id, name: d.delegate_name ?? d.full_name, email: d.email, is_kol: d.is_kol,
      totalClients, newClients: newInPeriod[d.id] ?? 0, activeClients, activityRate,
      billedCurrent, billedPrev, invoiceCount, pendiente, vencido, growth,
      grossMargin, commDelegate, commKol, commAffiliate, commCoord, totalChain,
      netContribution, marginPct, costCoverage,
      sig,
    };
  });

  rows.sort((a, b) => b.netContribution - a.netContribution);

  // Totals
  const totalBilled      = rows.reduce((s, r) => s + r.billedCurrent,    0);
  const totalPrev        = rows.reduce((s, r) => s + r.billedPrev,       0);
  const totalGrowth      = totalPrev > 0 ? ((totalBilled - totalPrev) / totalPrev) * 100 : null;
  const totalNetContrib  = rows.reduce((s, r) => s + r.netContribution, 0);
  const totalChain       = rows.reduce((s, r) => s + r.totalChain,      0);
  const totalGrossMargin = rows.reduce((s, r) => s + r.grossMargin,     0);
  const totalCommission  = totalChain; // alias for KPI card
  const activeCount      = rows.filter(r => r.billedCurrent > 0).length;
  const newClients       = rows.reduce((s, r) => s + r.newClients,       0);
  const greenCount       = rows.filter(r => r.sig === "green").length;
  const redCount         = rows.filter(r => r.sig === "red").length;
  const overallMarginPct = totalBilled > 0 ? (totalGrossMargin / totalBilled) * 100 : null;

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Rendimiento de delegados</h1>
          <p className="mt-1 text-sm text-[#6B7280] capitalize">
            {periodLabel} · comparado con {prevLabel}
          </p>
        </div>
        <MonthPicker mesStr={mesStr} isCurrentMes={isCurrentMes} />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          {
            label: "Facturación período",
            value: fmtEuro(totalBilled),
            sub: totalGrowth !== null
              ? <span className={totalGrowth >= 0 ? "text-green-600" : "text-red-600"}>{fmtPct(totalGrowth)} vs mes anterior</span>
              : <span className="text-[#9CA3AF]">sin datos anteriores</span>,
            accent: "#8E0E1A",
          },
          {
            label: "Margen bruto total",
            value: fmtEuro(totalGrossMargin),
            sub: overallMarginPct != null
              ? <span className={overallMarginPct >= 40 ? "text-green-600" : overallMarginPct >= 20 ? "text-amber-600" : "text-red-600"}>
                  {overallMarginPct.toFixed(1)}% sobre ingresos cubiertos
                </span>
              : <span className="text-[#9CA3AF]">sin datos de coste</span>,
            accent: "#059669",
          },
          {
            label: "Comisiones pagadas",
            value: fmtEuro(totalCommission),
            sub: <span className="text-[#6B7280]">estimado sobre facturación</span>,
            accent: "#7C3AED",
          },
          {
            label: "Beneficio neto total",
            value: fmtEuro(totalNetContrib),
            sub: <span className={totalNetContrib >= 0 ? "text-green-600" : "text-red-600"}>
              margen − comisiones
            </span>,
            accent: totalNetContrib >= 0 ? "#2563EB" : "#DC2626",
          },
          {
            label: "Delegados activos",
            value: `${activeCount} / ${rows.length}`,
            sub: <span>{greenCount} rentables · {redCount} bajo rendimiento · {newClients} clientes nuevos</span>,
            accent: "#D97706",
          },
        ].map(({ label, value, sub, accent }) => (
          <div key={label} className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
            <div style={{ backgroundColor: accent, height: 3 }} />
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">{label}</p>
              <p className="mt-1 text-xl font-bold text-[#0A0A0A] tabular-nums">{value}</p>
              <p className="mt-1 text-xs">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Delegate table */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                {[
                  { h: "Delegado",                w: "" },
                  { h: "Clientes",                w: "text-center" },
                  { h: "Nuevos",                  w: "text-center" },
                  { h: "% Activ.",                w: "text-center" },
                  { h: `Facturación`,             w: "text-right" },
                  { h: `vs mes ant.`,             w: "text-center" },
                  { h: "Margen bruto",            w: "text-right" },
                  { h: "Margen %",                w: "text-center" },
                  { h: "Comisión est.",           w: "text-right" },
                  { h: "Beneficio neto",          w: "text-right" },
                  { h: "Pendiente",               w: "text-right" },
                  { h: "Vencido",                 w: "text-right" },
                  { h: "Señal",                   w: "" },
                ].map(({ h, w }) => (
                  <th key={h} className={`px-3 py-3 text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap ${w}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {rows.map(r => {
                const sb = signalBadge[r.sig];
                return (
                  <tr key={r.id} className="hover:bg-[#F9FAFB] transition-colors">

                    {/* Delegado */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/dashboard/rendimiento/${r.id}`} className="font-medium text-[#0A0A0A] hover:text-[#8E0E1A] transition-colors text-sm">
                          {r.name}
                        </Link>
                        {r.is_kol && <span className="text-[9px] font-semibold px-1 py-0.5 rounded-full bg-purple-50 text-purple-700">KOL</span>}
                        <Link href={`/dashboard/delegados/${r.id}`} className="text-[10px] text-[#9CA3AF] hover:text-[#8E0E1A]" title="Dashboard del delegado">↗</Link>
                      </div>
                      {r.email && <p className="text-[10px] text-[#9CA3AF] mt-0.5">{r.email}</p>}
                    </td>

                    {/* Clientes */}
                    <td className="px-3 py-3 tabular-nums text-center text-[#374151] text-xs">
                      {r.activeClients}/{r.totalClients}
                    </td>

                    {/* Nuevos */}
                    <td className="px-3 py-3 tabular-nums text-center">
                      {r.newClients > 0
                        ? <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">+{r.newClients}</span>
                        : <span className="text-[#D1D5DB] text-xs">—</span>}
                    </td>

                    {/* % Actividad */}
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <div className="w-10 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${Math.round(r.activityRate * 100)}%`,
                            backgroundColor: r.activityRate >= 0.3 ? "#059669" : r.activityRate >= 0.15 ? "#D97706" : "#EF4444",
                          }} />
                        </div>
                        <span className="text-xs text-[#374151] tabular-nums w-7 text-right">{Math.round(r.activityRate * 100)}%</span>
                      </div>
                    </td>

                    {/* Facturación */}
                    <td className="px-3 py-3 tabular-nums text-right font-semibold text-[#0A0A0A] text-sm whitespace-nowrap">
                      {r.billedCurrent > 0 ? fmtEuro(r.billedCurrent) : <span className="text-[#D1D5DB] font-normal">—</span>}
                    </td>

                    {/* vs mes ant */}
                    <td className="px-3 py-3 tabular-nums text-center">
                      {r.growth !== null
                        ? <span className={`text-xs font-semibold ${r.growth >= 0 ? "text-green-600" : "text-red-600"}`}>{fmtPct(r.growth)}</span>
                        : <span className="text-[#D1D5DB] text-xs">n/d</span>}
                    </td>

                    {/* Margen bruto */}
                    <td className="px-3 py-3 tabular-nums text-right whitespace-nowrap">
                      {r.grossMargin > 0
                        ? <span className="text-green-700 font-semibold text-sm">{fmtEuro(r.grossMargin)}</span>
                        : r.costCoverage === 0
                          ? <span className="text-[10px] text-[#9CA3AF] italic">sin coste</span>
                          : <span className="text-red-600 font-semibold text-sm">{fmtEuro(r.grossMargin)}</span>}
                    </td>

                    {/* Margen % */}
                    <td className="px-3 py-3 tabular-nums text-center">
                      {r.marginPct !== null
                        ? <span className={`text-xs font-semibold ${r.marginPct >= 40 ? "text-green-600" : r.marginPct >= 20 ? "text-amber-600" : "text-red-600"}`}>
                            {r.marginPct.toFixed(1)}%
                          </span>
                        : <span className="text-[#D1D5DB] text-xs">—</span>}
                      {r.costCoverage > 0 && r.costCoverage < 100 && (
                        <p className="text-[9px] text-[#9CA3AF]">{r.costCoverage.toFixed(0)}% cubiert.</p>
                      )}
                    </td>

                    {/* Comisión cadena */}
                    <td className="px-3 py-3 tabular-nums text-right whitespace-nowrap">
                      {r.totalChain > 0 ? (
                        <div>
                          <span className="font-semibold text-sm text-[#7C3AED]">{fmtEuro(r.totalChain)}</span>
                          <div className="text-[9px] text-[#9CA3AF] leading-tight mt-0.5 space-y-0.5">
                            {r.commDelegate > 0 && <p>Del: {fmtEuro(r.commDelegate)}</p>}
                            {r.commKol      > 0 && <p>KOL: {fmtEuro(r.commKol)}</p>}
                            {r.commAffiliate > 0 && <p>Afil: {fmtEuro(r.commAffiliate)}</p>}
                            {r.commCoord    > 0 && <p>Coord: {fmtEuro(r.commCoord)}</p>}
                          </div>
                        </div>
                      ) : <span className="text-[#D1D5DB]">—</span>}
                    </td>

                    {/* Beneficio neto */}
                    <td className="px-3 py-3 tabular-nums text-right whitespace-nowrap">
                      {r.costCoverage === 0
                        ? <span className="text-[10px] text-[#9CA3AF] italic">sin datos</span>
                        : <span className={`font-bold text-sm ${r.netContribution >= 0 ? "text-[#0A0A0A]" : "text-red-600"}`}>
                            {fmtEuro(r.netContribution)}
                          </span>}
                    </td>

                    {/* Pendiente */}
                    <td className="px-3 py-3 tabular-nums text-right whitespace-nowrap">
                      {r.pendiente > 0
                        ? <span className="text-amber-700 font-medium text-xs">{fmtEuro(r.pendiente)}</span>
                        : <span className="text-[#D1D5DB] text-xs">—</span>}
                    </td>

                    {/* Vencido */}
                    <td className="px-3 py-3 tabular-nums text-right whitespace-nowrap">
                      {r.vencido > 0
                        ? <span className="text-red-600 font-semibold text-xs">{fmtEuro(r.vencido)}</span>
                        : <span className="text-[#D1D5DB] text-xs">—</span>}
                    </td>

                    {/* Señal */}
                    <td className="px-3 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${sb.cls}`}>
                        {sb.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Totals footer row */}
            <tfoot>
              <tr className="border-t-2 border-[#E5E7EB] bg-[#F9FAFB] font-semibold">
                <td className="px-3 py-3 text-xs text-[#6B7280]">{rows.length} delegados</td>
                <td colSpan={3} />
                <td className="px-3 py-3 tabular-nums text-right text-sm text-[#0A0A0A]">{fmtEuro(totalBilled)}</td>
                <td />
                <td className="px-3 py-3 tabular-nums text-right text-sm text-green-700">{fmtEuro(totalGrossMargin)}</td>
                <td className="px-3 py-3 tabular-nums text-center text-xs text-green-700">
                  {overallMarginPct != null ? `${overallMarginPct.toFixed(1)}%` : "—"}
                </td>
                <td className="px-3 py-3 tabular-nums text-right text-sm text-[#7C3AED]">{fmtEuro(totalChain)}</td>
                <td className="px-3 py-3 tabular-nums text-right text-sm font-bold text-[#0A0A0A]">{fmtEuro(totalNetContrib)}</td>
                <td className="px-3 py-3 tabular-nums text-right text-xs text-amber-700">{fmtEuro(rows.reduce((s,r)=>s+r.pendiente,0))}</td>
                <td className="px-3 py-3 tabular-nums text-right text-xs text-red-600">{fmtEuro(rows.reduce((s,r)=>s+r.vencido,0))}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#6B7280]">
        <span className="font-semibold text-[#9CA3AF] uppercase tracking-wider">Leyenda:</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />Rentable — beneficio neto positivo, actividad ≥30% y creciendo</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1" />Regular — activo pero con margen bajo o decreciendo</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />Bajo — sin facturación o beneficio negativo</span>
        <span className="text-[#9CA3AF]">· Margen bruto y beneficio calculados solo sobre productos con coste en Holded · Comisión estimada</span>
      </div>
    </div>
  );
}
