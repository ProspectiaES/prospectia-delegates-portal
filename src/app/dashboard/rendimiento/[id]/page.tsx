import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const fmtEuro2 = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const fmtMonth = (y: number, m: number) =>
  new Date(y, m - 1).toLocaleDateString("es-ES", { month: "short", year: "2-digit" });

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(year: number, month: number) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)).toISOString(),
    end:   new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString(),
  };
}

// Last N months as { year, month } pairs, newest first
function lastNMonths(n: number) {
  const now = new Date();
  const result = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return result;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DelegatePerformancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const { id } = await params;
  const admin   = createAdminClient();
  const now     = new Date();

  const curYear  = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const { start: curStart, end: curEnd } = monthRange(curYear, curMonth);

  // 12 months window
  const months   = lastNMonths(12);
  const oldest   = months[months.length - 1];
  const histStart = new Date(Date.UTC(oldest.year, oldest.month - 1, 1)).toISOString();

  // ── Fetch all data in parallel ──
  const [delegateRes, cdRes, histInvRes, curPaidRes, pendRes, vencRes, contactsRes, productsRes] = await Promise.all([
    admin.from("profiles")
      .select("id, full_name, delegate_name, email, phone, nif, city, address, postal_code, iban, is_kol, created_at, contact_id")
      .eq("id", id)
      .maybeSingle(),

    admin.from("contact_delegates")
      .select("contact_id, assigned_at")
      .eq("delegate_id", id),

    // Historical paid invoices (last 12 months)
    admin.from("holded_invoices")
      .select("contact_id, total, date_paid, doc_number")
      .eq("status", 3)
      .eq("is_credit_note", false)
      .gte("date_paid", histStart),

    // Current period paid (with more detail)
    admin.from("holded_invoices")
      .select("id, doc_number, contact_id, contact_name, total, date_paid, raw")
      .eq("status", 3)
      .eq("is_credit_note", false)
      .gte("date_paid", curStart)
      .lte("date_paid", curEnd),

    // Pending
    admin.from("holded_invoices")
      .select("id, doc_number, contact_id, contact_name, total, due_date")
      .eq("status", 1),

    // Overdue
    admin.from("holded_invoices")
      .select("id, doc_number, contact_id, contact_name, total, due_date")
      .eq("status", 2),

    // All contacts of this delegate (for LTV + dormancy)
    admin.from("holded_contacts")
      .select("id, name, city"),

    // Products with cost for margin calc
    admin.from("holded_products")
      .select("id, cost, commission_delegate, commission_delegate_type"),
  ]);

  if (!delegateRes.data) notFound();
  const d = delegateRes.data;
  const displayName = d.delegate_name ?? d.full_name;

  const cdRows = (cdRes.data ?? []) as { contact_id: string; assigned_at: string }[];
  const contactIds = new Set(cdRows.map(c => c.contact_id));

  type InvBasic = { contact_id: string; total: number; date_paid: string | null; doc_number: string | null };
  type InvFull  = InvBasic & { id: string; contact_name: string | null; raw: Record<string, unknown> };
  type InvStatus = { id: string; doc_number: string | null; contact_id: string; contact_name: string | null; total: number; due_date: string | null };

  // Filter to this delegate's contacts only
  const histInvs  = ((histInvRes.data  ?? []) as InvBasic[])  .filter(i => contactIds.has(i.contact_id));
  const curPaid   = ((curPaidRes.data  ?? []) as InvFull[])   .filter(i => contactIds.has(i.contact_id));
  const pendInvs  = ((pendRes.data     ?? []) as InvStatus[]) .filter(i => contactIds.has(i.contact_id));
  const vencInvs  = ((vencRes.data     ?? []) as InvStatus[]) .filter(i => contactIds.has(i.contact_id));

  // All-time totals per contact (from historical — limited to 12m, good enough for display)
  const ltv: Record<string, number> = {};
  const lastInvoiceDate: Record<string, string> = {};
  for (const inv of histInvs) {
    ltv[inv.contact_id] = (ltv[inv.contact_id] ?? 0) + inv.total;
    if (inv.date_paid) {
      const prev = lastInvoiceDate[inv.contact_id];
      if (!prev || inv.date_paid > prev) lastInvoiceDate[inv.contact_id] = inv.date_paid;
    }
  }

  // ── Monthly buckets ──
  interface MonthBucket {
    year: number; month: number;
    billed: number; invoiceCount: number; activeClients: number; newClients: number;
  }

  const buckets: Record<string, MonthBucket> = {};
  for (const { year, month } of months) {
    const k = `${year}-${String(month).padStart(2, "0")}`;
    buckets[k] = { year, month, billed: 0, invoiceCount: 0, activeClients: 0, newClients: 0 };
  }

  // Paid invoices → monthly billed
  const activeByMonth: Record<string, Set<string>> = {};
  for (const inv of histInvs) {
    if (!inv.date_paid) continue;
    const k = monthKey(inv.date_paid);
    if (!buckets[k]) continue;
    buckets[k].billed += inv.total;
    buckets[k].invoiceCount++;
    if (!activeByMonth[k]) activeByMonth[k] = new Set();
    activeByMonth[k].add(inv.contact_id);
  }
  for (const k of Object.keys(buckets)) {
    buckets[k].activeClients = activeByMonth[k]?.size ?? 0;
  }

  // New clients by assigned_at month
  for (const cd of cdRows) {
    const k = monthKey(cd.assigned_at);
    if (buckets[k]) buckets[k].newClients++;
  }

  const monthList = months.slice().reverse(); // chronological
  const maxBilled = Math.max(...monthList.map(({ year, month }) => buckets[`${year}-${String(month).padStart(2,"0")}`]?.billed ?? 0), 1);

  // ── Current period ──
  const curBilled  = curPaid.reduce((s, i) => s + i.total, 0);
  const curActive  = new Set(curPaid.map(i => i.contact_id)).size;
  const curNewClients = cdRows.filter(c => c.assigned_at >= curStart && c.assigned_at <= curEnd).length;
  const pendTotal  = pendInvs.reduce((s, i) => s + i.total, 0);
  const vencTotal  = vencInvs.reduce((s, i) => s + i.total, 0);
  const ticketMed  = curPaid.length > 0 ? curBilled / curPaid.length : 0;

  // ── Margin / profitability (current period) ──
  type CommType = "percent" | "amount";
  const productMap: Record<string, { cost: number | null; commission_delegate: number | null; commission_delegate_type: CommType }> = {};
  for (const p of (productsRes.data ?? []) as { id: string; cost: number | null; commission_delegate: number | null; commission_delegate_type: string }[]) {
    productMap[p.id] = { cost: p.cost, commission_delegate: p.commission_delegate, commission_delegate_type: (p.commission_delegate_type ?? "percent") as CommType };
  }

  type RawLine = { productId?: string; units?: number | string; price?: number | string; discount?: number | string };

  function calcLineComm(units: number, price: number, discount: number, rate: number | null, type: CommType) {
    if (!rate) return 0;
    const net = units * price * (1 - discount / 100);
    return type === "amount" ? units * rate : (net * rate) / 100;
  }

  let marginRevenue  = 0;  // revenue on lines with known cost
  let marginCogs     = 0;  // COGS (incl. FOC)
  let marginComm     = 0;  // estimated commission
  let focCost        = 0;  // cost of FOC lines specifically
  let coveredRevPct  = 0;  // % of total revenue covered by products with cost

  for (const inv of curPaid) {
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
        const lineCogs = units * prod.cost;
        marginCogs    += lineCogs;
        marginRevenue += lineNet;
        if (isFoc) focCost += lineCogs;
      }
      if (!isFoc) {
        marginComm += calcLineComm(units, price, discount, prod.commission_delegate, prod.commission_delegate_type);
      }
    }
  }

  const grossMargin     = marginRevenue - marginCogs;
  const netContribution = grossMargin - marginComm;
  const grossMarginPct  = marginRevenue > 0 ? (grossMargin / marginRevenue) * 100 : null;
  coveredRevPct         = curBilled > 0 ? (marginRevenue / curBilled) * 100 : 0;

  // Previous month comparison
  const prevM = curMonth === 1 ? { year: curYear - 1, month: 12 } : { year: curYear, month: curMonth - 1 };
  const prevKey = `${prevM.year}-${String(prevM.month).padStart(2, "0")}`;
  const prevBilled = buckets[prevKey]?.billed ?? 0;
  const growth = prevBilled > 0 ? ((curBilled - prevBilled) / prevBilled) * 100 : null;

  // YTD (Jan–now of current year)
  const ytdBilled = monthList
    .filter(({ year }) => year === curYear)
    .reduce((s, { year, month }) => s + (buckets[`${year}-${String(month).padStart(2,"0")}`]?.billed ?? 0), 0);

  // ── Client breakdown ──
  const contactMap = new Map(
    ((contactsRes.data ?? []) as { id: string; name: string; city: string | null }[])
      .filter(c => contactIds.has(c.id))
      .map(c => [c.id, c])
  );

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const sixtyDaysAgo  = new Date(Date.now() - 60 * 86_400_000).toISOString();

  interface ClientRow {
    id: string; name: string; city: string | null;
    lastInvoice: string | null; assignedAt: string;
    ltv12m: number; curBilled: number;
    status: "active" | "dormant30" | "dormant60" | "inactive";
  }

  const curBilledByContact: Record<string, number> = {};
  for (const inv of curPaid) curBilledByContact[inv.contact_id] = (curBilledByContact[inv.contact_id] ?? 0) + inv.total;

  const clientRows: ClientRow[] = cdRows.map(cd => {
    const contact = contactMap.get(cd.contact_id);
    const last = lastInvoiceDate[cd.contact_id] ?? null;
    let status: ClientRow["status"] = "inactive";
    if (last) {
      if (last >= curStart) status = "active";
      else if (last >= thirtyDaysAgo) status = "dormant30";
      else if (last >= sixtyDaysAgo)  status = "dormant60";
      else status = "inactive";
    }
    return {
      id: cd.contact_id,
      name: contact?.name ?? cd.contact_id,
      city: contact?.city ?? null,
      lastInvoice: last,
      assignedAt: cd.assigned_at,
      ltv12m: ltv[cd.contact_id] ?? 0,
      curBilled: curBilledByContact[cd.contact_id] ?? 0,
      status,
    };
  }).sort((a, b) => (b.ltv12m - a.ltv12m));

  const activeClients   = clientRows.filter(c => c.status === "active").length;
  const dormant30       = clientRows.filter(c => c.status === "dormant30").length;
  const dormant60       = clientRows.filter(c => c.status === "dormant60").length;
  const inactiveClients = clientRows.filter(c => c.status === "inactive").length;

  const periodLabel = new Date(curYear, curMonth - 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/rendimiento" className="mt-1 text-[#6B7280] hover:text-[#8E0E1A] transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 4L6 8l4 4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">{displayName}</h1>
              {d.is_kol && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">KOL</span>}
            </div>
            <p className="mt-0.5 text-sm text-[#6B7280]">
              {d.email ?? ""}{d.email && d.city ? " · " : ""}{d.city ?? ""}
              {d.nif ? ` · ${d.nif}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-[#9CA3AF]">
              Delegado desde {fmtDate(d.created_at)} · {contactIds.size} clientes asignados
            </p>
          </div>
        </div>
        <Link
          href={`/dashboard/delegados/${id}`}
          className="h-9 px-4 flex items-center gap-2 text-sm font-semibold border border-[#E5E7EB] rounded-lg bg-white hover:border-[#8E0E1A] hover:text-[#8E0E1A] transition-colors shadow-sm"
        >
          Ir al dashboard del delegado
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </div>

      {/* KPI cards — current period */}
      <div>
        <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">Período actual — {periodLabel}</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: "Facturación", value: fmtEuro(curBilled), sub: growth !== null ? (growth >= 0 ? `+${growth.toFixed(1)}% vs mes ant.` : `${growth.toFixed(1)}% vs mes ant.`) : "sin datos prev.", color: growth === null ? "#6B7280" : growth >= 0 ? "#059669" : "#DC2626", accent: "#8E0E1A" },
            { label: "Clientes activos", value: `${curActive}`, sub: `${contactIds.size} totales · ${Math.round(curActive / Math.max(contactIds.size, 1) * 100)}% actividad`, color: "#374151", accent: "#059669" },
            { label: "Clientes nuevos", value: `+${curNewClients}`, sub: "asignados este mes", color: "#374151", accent: "#2563EB" },
            { label: "Ticket medio", value: fmtEuro(ticketMed), sub: `${curPaid.length} facturas cobradas`, color: "#374151", accent: "#7C3AED" },
            { label: "YTD " + curYear, value: fmtEuro(ytdBilled), sub: `acumulado enero–${new Date(curYear, curMonth - 1).toLocaleDateString("es-ES",{month:"short"})}`, color: "#374151", accent: "#D97706" },
          ].map(({ label, value, sub, color, accent }) => (
            <div key={label} className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
              <div style={{ backgroundColor: accent, height: 3 }} />
              <div className="px-4 py-3">
                <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">{label}</p>
                <p className="mt-1 text-xl font-bold text-[#0A0A0A] tabular-nums">{value}</p>
                <p className="mt-0.5 text-xs tabular-nums" style={{ color }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Profitability breakdown */}
      {(marginRevenue > 0 || marginCogs > 0) && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F9FAFB]">
            <h2 className="text-sm font-bold text-[#0A0A0A]">Rentabilidad del período — {periodLabel}</h2>
            {coveredRevPct < 100 && (
              <span className="text-xs text-[#9CA3AF]">Cobertura de coste: {coveredRevPct.toFixed(0)}% de los ingresos</span>
            )}
          </div>
          <div className="px-5 py-4">
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              {[
                { label: "Ingresos cubiertos",  value: fmtEuro(marginRevenue), color: "#374151",  note: coveredRevPct < 99 ? `${coveredRevPct.toFixed(0)}% del total` : "100% del total" },
                { label: "Coste productos",      value: fmtEuro(marginCogs),    color: "#DC2626",  note: focCost > 0 ? `incl. ${fmtEuro(focCost)} en FOC` : "sin FOC en este período" },
                { label: "Margen bruto",         value: fmtEuro(grossMargin),   color: grossMargin >= 0 ? "#059669" : "#DC2626",
                  note: grossMarginPct != null ? `${grossMarginPct.toFixed(1)}% sobre ingresos` : "" },
                { label: "Comisión estimada",    value: fmtEuro(marginComm),    color: "#7C3AED",  note: "delegado (no recomendador)" },
                { label: "Beneficio neto",       value: fmtEuro(netContribution), color: netContribution >= 0 ? "#0A0A0A" : "#DC2626",
                  note: "margen − comisión" },
                { label: "ROI delegado",
                  value: marginComm > 0 ? `${(netContribution / marginComm * 100).toFixed(0)}%` : "—",
                  color: netContribution >= 0 ? "#059669" : "#DC2626",
                  note: "beneficio por €1 de comisión" },
              ].map(({ label, value, color, note }) => (
                <div key={label} className="space-y-1">
                  <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{label}</p>
                  <p className="text-lg font-bold tabular-nums" style={{ color }}>{value}</p>
                  <p className="text-[10px] text-[#9CA3AF]">{note}</p>
                </div>
              ))}
            </div>
            {focCost > 0 && (
              <div className="mt-4 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-700">
                <strong>FOC detectado:</strong> este delegado ha generado {fmtEuro(focCost)} en coste de productos entregados gratuitamente (precio = 0). Este coste ya está incluido en el cálculo del margen bruto.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Alerts row */}
      {(pendTotal > 0 || vencTotal > 0) && (
        <div className="flex gap-3 flex-wrap">
          {pendTotal > 0 && (
            <div className="flex-1 min-w-[200px] rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Pendiente de cobro</p>
                <p className="text-xl font-bold text-amber-800 tabular-nums">{fmtEuro(pendTotal)}</p>
                <p className="text-xs text-amber-600">{pendInvs.length} factura{pendInvs.length !== 1 ? "s" : ""}</p>
              </div>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.5" className="opacity-40">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
              </svg>
            </div>
          )}
          {vencTotal > 0 && (
            <div className="flex-1 min-w-[200px] rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wider">Vencido impagado</p>
                <p className="text-xl font-bold text-red-700 tabular-nums">{fmtEuro(vencTotal)}</p>
                <p className="text-xs text-red-600">{vencInvs.length} factura{vencInvs.length !== 1 ? "s" : ""} · riesgo alto</p>
              </div>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="1.5" className="opacity-40">
                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Monthly evolution — 12 months */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#0A0A0A]">Evolución mensual — últimos 12 meses</h2>
          <span className="text-xs text-[#6B7280]">YTD {curYear}: <span className="font-semibold text-[#0A0A0A]">{fmtEuro(ytdBilled)}</span></span>
        </div>

        {/* Bar chart */}
        <div className="px-5 pt-5 pb-2">
          <div className="flex items-end gap-1.5 h-28">
            {monthList.map(({ year, month }) => {
              const k   = `${year}-${String(month).padStart(2, "0")}`;
              const bkt = buckets[k];
              const pct = maxBilled > 0 ? (bkt.billed / maxBilled) * 100 : 0;
              const isCur = year === curYear && month === curMonth;
              return (
                <div key={k} className="flex-1 flex flex-col items-center gap-1" title={`${fmtMonth(year,month)}: ${fmtEuro(bkt.billed)}`}>
                  <div className="w-full flex flex-col justify-end" style={{ height: 96 }}>
                    <div
                      className="w-full rounded-t-sm transition-all"
                      style={{
                        height: `${Math.max(pct, bkt.billed > 0 ? 3 : 0)}%`,
                        backgroundColor: isCur ? "#8E0E1A" : "#E5E7EB",
                        minHeight: bkt.billed > 0 ? 2 : 0,
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-[#9CA3AF] leading-none whitespace-nowrap">
                    {fmtMonth(year, month)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-t border-[#F3F4F6]">
            <thead>
              <tr className="bg-[#F9FAFB]">
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">Mes</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">Facturación</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">Nº facturas</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">Ticket medio</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">Clientes activos</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">Nuevos</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">vs anterior</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {monthList.slice().reverse().map(({ year, month }, idx, arr) => {
                const k    = `${year}-${String(month).padStart(2,"0")}`;
                const bkt  = buckets[k];
                const isCur = year === curYear && month === curMonth;
                const prevIdx = idx + 1;
                const prevBkt = prevIdx < arr.length
                  ? buckets[`${arr[prevIdx].year}-${String(arr[prevIdx].month).padStart(2,"0")}`]
                  : null;
                const vsAnt = prevBkt && prevBkt.billed > 0
                  ? ((bkt.billed - prevBkt.billed) / prevBkt.billed) * 100
                  : null;
                return (
                  <tr key={k} className={isCur ? "bg-[#FFF5F5]" : "hover:bg-[#F9FAFB]"}>
                    <td className="px-4 py-2 whitespace-nowrap capitalize font-medium text-[#374151]">
                      {new Date(year, month - 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                      {isCur && <span className="ml-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#8E0E1A] text-white">actual</span>}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold text-[#0A0A0A]">
                      {bkt.billed > 0 ? fmtEuro(bkt.billed) : <span className="text-[#D1D5DB]">—</span>}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-[#6B7280]">{bkt.invoiceCount || "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-[#6B7280]">
                      {bkt.invoiceCount > 0 ? fmtEuro(bkt.billed / bkt.invoiceCount) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-[#374151]">{bkt.activeClients || "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-[#374151]">
                      {bkt.newClients > 0 ? <span className="text-blue-600 font-semibold">+{bkt.newClients}</span> : "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {vsAnt !== null
                        ? <span className={vsAnt >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                            {vsAnt >= 0 ? "+" : ""}{vsAnt.toFixed(1)}%
                          </span>
                        : <span className="text-[#D1D5DB]">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two-column: client status breakdown + current period invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Client status */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB]">
            <h2 className="text-sm font-bold text-[#0A0A0A]">Estado de clientes</h2>
            <p className="text-xs text-[#6B7280] mt-0.5">{contactIds.size} clientes asignados</p>
          </div>
          <div className="p-4 space-y-3">
            {[
              { label: "Activos este mes",  count: activeClients,   color: "#059669", bg: "#ECFDF5", desc: "factura cobrada en el período" },
              { label: "Inactivos <30 días",count: dormant30,       color: "#D97706", bg: "#FFFBEB", desc: "última compra hace <30 días" },
              { label: "Inactivos <60 días",count: dormant60,       color: "#DC2626", bg: "#FEF2F2", desc: "última compra hace 30–60 días" },
              { label: "Sin actividad",     count: inactiveClients, color: "#9CA3AF", bg: "#F9FAFB", desc: ">60 días o nunca han comprado" },
            ].map(({ label, count, color, bg, desc }) => (
              <div key={label} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: bg }}>
                <div>
                  <p className="text-xs font-semibold" style={{ color }}>{label}</p>
                  <p className="text-[10px] text-[#9CA3AF] mt-0.5">{desc}</p>
                </div>
                <span className="text-2xl font-bold tabular-nums" style={{ color }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Current period invoices */}
        <div className="lg:col-span-2 rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0A0A0A]">Facturas cobradas — {periodLabel}</h2>
            <span className="text-xs text-[#6B7280]">{curPaid.length} facturas · {fmtEuro(curBilled)}</span>
          </div>
          {curPaid.length === 0 ? (
            <p className="px-5 py-8 text-sm text-[#6B7280] text-center">Sin facturas cobradas en este período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    {["Factura", "Cliente", "Cobro", "Importe"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {curPaid.slice(0, 20).map(inv => (
                    <tr key={inv.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-4 py-2 font-mono font-semibold text-[#374151]">{inv.doc_number ?? inv.id.slice(0,8)}</td>
                      <td className="px-4 py-2 text-[#374151]">{inv.contact_name ?? "—"}</td>
                      <td className="px-4 py-2 text-[#6B7280] whitespace-nowrap">{fmtDate(inv.date_paid)}</td>
                      <td className="px-4 py-2 tabular-nums font-semibold text-[#0A0A0A] whitespace-nowrap">{fmtEuro2(inv.total)}</td>
                    </tr>
                  ))}
                  {curPaid.length > 20 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-xs text-[#9CA3AF] text-center">
                        + {curPaid.length - 20} facturas más
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Full client table */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-sm font-bold text-[#0A0A0A]">Todos los clientes</h2>
          <p className="text-xs text-[#6B7280] mt-0.5">Ordenados por facturación en últimos 12 meses</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                {["Cliente", "Ciudad", "Facturación período", "LTV 12m", "Última factura", "Asignado", "Estado"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {clientRows.map(c => {
                const statusCfg = {
                  active:    { label: "Activo",      cls: "bg-green-50 text-green-700" },
                  dormant30: { label: "<30 días",    cls: "bg-amber-50 text-amber-700" },
                  dormant60: { label: "30–60 días",  cls: "bg-orange-50 text-orange-700" },
                  inactive:  { label: "Inactivo",    cls: "bg-gray-100 text-gray-500" },
                }[c.status];
                return (
                  <tr key={c.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-4 py-2.5 font-medium text-[#0A0A0A]">{c.name}</td>
                    <td className="px-4 py-2.5 text-[#6B7280]">{c.city ?? "—"}</td>
                    <td className="px-4 py-2.5 tabular-nums font-semibold text-[#0A0A0A]">
                      {c.curBilled > 0 ? fmtEuro2(c.curBilled) : <span className="text-[#D1D5DB] font-normal">—</span>}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-[#374151]">
                      {c.ltv12m > 0 ? fmtEuro2(c.ltv12m) : <span className="text-[#D1D5DB]">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-[#6B7280] whitespace-nowrap text-xs">{fmtDate(c.lastInvoice)}</td>
                    <td className="px-4 py-2.5 text-[#9CA3AF] whitespace-nowrap text-xs">{fmtDate(c.assignedAt)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusCfg.cls}`}>
                        {statusCfg.label}
                      </span>
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
