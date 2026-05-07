import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { delegateStatus, STATUS_BADGE } from "@/lib/skus";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtEuro  = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
const fmtEuro2 = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);
const fmtDate  = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
const fmtPct   = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
const fmtMonth = (y: number, m: number) => new Date(y, m - 1).toLocaleDateString("es-ES", { month: "short", year: "2-digit" });

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
function lastNMonths(n: number) {
  const now = new Date();
  const res = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    res.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return res;
}

type CommType = "percent" | "amount";
function calcLine(units: number, price: number, disc: number, rate: number | null, type: CommType) {
  if (!rate) return 0;
  const net = units * price * (1 - disc / 100);
  return type === "amount" ? units * rate : (net * rate) / 100;
}
const AFFILIATE_RATE = 0.20;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DelegatePerformanceDrillPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const { id } = await params;
  const admin   = createAdminClient();
  const now     = new Date();
  const curYear = now.getFullYear(), curMonth = now.getMonth() + 1;

  const months    = lastNMonths(12);
  const oldest    = months[months.length - 1];
  const histStart = new Date(Date.UTC(oldest.year, oldest.month - 1, 1)).toISOString();

  const [delegateRes, cdRes, histInvRes, overdueRes, productsRes, contactsRes] = await Promise.all([
    admin.from("profiles")
      .select("id, full_name, delegate_name, email, phone, nif, city, address, postal_code, iban, is_kol, created_at")
      .eq("id", id).maybeSingle(),

    admin.from("contact_delegates").select("contact_id, assigned_at").eq("delegate_id", id),

    admin.from("holded_invoices")
      .select("id, contact_id, subtotal, total, date_paid, doc_number, raw")
      .eq("status", 3).eq("is_credit_note", false)
      .gte("date_paid", histStart),

    admin.from("holded_invoices")
      .select("id, doc_number, contact_id, contact_name, total, due_date")
      .eq("status", 2),

    admin.from("holded_products")
      .select("id, sku, cost, purchase_price, commission_delegate, commission_delegate_type, commission_4, commission_4_type, commission_5, commission_5_type"),

    admin.from("holded_contacts")
      .select("id, name, city, kol_id, affiliate_id, coordinator_id, recommender_id, recommender_rate"),
  ]);

  if (!delegateRes.data) notFound();
  const d = delegateRes.data;
  const displayName = d.delegate_name ?? d.full_name;

  const cdRows    = (cdRes.data ?? []) as { contact_id: string; assigned_at: string }[];
  const contactIds = new Set(cdRows.map(c => c.contact_id));

  type InvHist = { id: string; contact_id: string; subtotal: number | null; total: number; date_paid: string | null; doc_number: string | null; raw: Record<string, unknown> };
  type InvOverdue = { id: string; doc_number: string | null; contact_id: string; contact_name: string | null; total: number; due_date: string | null };

  const allInvs   = ((histInvRes.data  ?? []) as InvHist[]).filter(i => contactIds.has(i.contact_id));
  const vencInvs  = ((overdueRes.data  ?? []) as InvOverdue[]).filter(i => contactIds.has(i.contact_id));

  // Bixgrow for current period invoices
  const curStart = new Date(Date.UTC(curYear, curMonth - 1, 1)).toISOString();
  const curEnd   = new Date(Date.UTC(curYear, curMonth, 0, 23, 59, 59, 999)).toISOString();
  const curInvIds = allInvs.filter(i => i.date_paid && i.date_paid >= curStart && i.date_paid <= curEnd).map(i => i.id);
  const bixgrowRes = curInvIds.length > 0
    ? await admin.from("bixgrow_orders").select("invoice_id, commission").in("invoice_id", curInvIds)
    : { data: [] };

  const bixgrowMap: Record<string, number> = {};
  for (const bo of (bixgrowRes.data ?? []) as { invoice_id: string | null; commission: number }[]) {
    if (bo.invoice_id) bixgrowMap[bo.invoice_id] = (bixgrowMap[bo.invoice_id] ?? 0) + bo.commission;
  }

  // ── Product map ────────────────────────────────────────────────────────────
  const productMap: Record<string, { sku: string | null; cost: number | null; commission_delegate: number | null; commission_delegate_type: CommType; commission_4: number | null; commission_4_type: CommType; commission_5: number | null; commission_5_type: CommType }> = {};
  let sprayCost = 6;
  for (const p of (productsRes.data ?? []) as { id: string; sku: string | null; cost: number | null; purchase_price: number | null; commission_delegate: number | null; commission_delegate_type: string; commission_4: number | null; commission_4_type: string; commission_5: number | null; commission_5_type: string }[]) {
    const cost = p.cost ?? p.purchase_price ?? null;
    productMap[p.id] = { sku: p.sku, cost, commission_delegate: p.commission_delegate, commission_delegate_type: (p.commission_delegate_type ?? "percent") as CommType, commission_4: p.commission_4, commission_4_type: (p.commission_4_type ?? "percent") as CommType, commission_5: p.commission_5, commission_5_type: (p.commission_5_type ?? "percent") as CommType };
    if (p.sku === "VIHO-OBE-SPRAY-002" && cost != null) sprayCost = cost;
  }

  // ── Contact maps ───────────────────────────────────────────────────────────
  interface CMeta { kol_id: string | null; affiliate_id: string | null; coordinator_id: string | null; recommender_id: string | null; recommender_rate: number | null; name: string; city: string | null }
  const cmetaMap: Record<string, CMeta> = {};
  for (const c of (contactsRes.data ?? []) as (CMeta & { id: string })[]) cmetaMap[c.id] = c;

  // ── Monthly P&L buckets ────────────────────────────────────────────────────
  interface MonthBucket {
    year: number; month: number;
    sprayUnits: number; focUnits: number;
    ingresos: number;
    cogs: number; focCogs: number;
    commDelegate: number; commRec: number;
    commKol: number; commAffiliate: number; commCoord: number;
    invoiceCount: number;
    activeClients: Set<string>;
  }

  const buckets: Record<string, MonthBucket> = {};
  for (const { year, month } of months) {
    const k = `${year}-${String(month).padStart(2, "0")}`;
    buckets[k] = { year, month, sprayUnits: 0, focUnits: 0, ingresos: 0, cogs: 0, focCogs: 0, commDelegate: 0, commRec: 0, commKol: 0, commAffiliate: 0, commCoord: 0, invoiceCount: 0, activeClients: new Set() };
  }

  type RawLine = { productId?: string; units?: number | string; price?: number | string; discount?: number | string };

  for (const inv of allInvs) {
    if (!inv.date_paid) continue;
    const k = monthKey(inv.date_paid);
    if (!buckets[k]) continue;
    const bkt  = buckets[k];
    const meta = cmetaMap[inv.contact_id] ?? { kol_id: null, affiliate_id: null, coordinator_id: null, recommender_id: null, recommender_rate: null, name: "", city: null };

    bkt.invoiceCount++;
    bkt.activeClients.add(inv.contact_id);
    bkt.ingresos += inv.subtotal ?? 0;

    // Recommender commission
    if (meta.recommender_id) {
      const recRate = cmetaMap[meta.recommender_id]?.recommender_rate ?? 0;
      if (recRate > 0) bkt.commRec += (inv.subtotal ?? 0) * (recRate / 100);
    }

    // Affiliate commission: bixgrow real data or fallback
    if (bixgrowMap[inv.id] != null) {
      bkt.commAffiliate += bixgrowMap[inv.id];
    } else if (meta.affiliate_id) {
      bkt.commAffiliate += (inv.subtotal ?? 0) * AFFILIATE_RATE;
    }

    for (const rp of ((inv.raw?.products ?? []) as RawLine[])) {
      if (!rp.productId) continue;
      const prod = productMap[rp.productId];
      if (!prod) continue;
      const units = Number(rp.units) || 0;
      const price = Number(rp.price) || 0;
      const disc  = Number(rp.discount) || 0;
      const isFoc = price === 0;

      if (isFoc) {
        bkt.focUnits += units;
        bkt.focCogs  += units * sprayCost;
      } else {
        bkt.sprayUnits  += units;
        bkt.cogs        += units * sprayCost;
        bkt.commDelegate += calcLine(units, price, disc, prod.commission_delegate, prod.commission_delegate_type);
        if (meta.kol_id)         bkt.commKol   += calcLine(units, price, disc, prod.commission_4, prod.commission_4_type);
        if (meta.coordinator_id) bkt.commCoord += calcLine(units, price, disc, prod.commission_5, prod.commission_5_type);
      }
    }
  }

  const monthList = months.slice().reverse(); // chronological

  // ── Accumulated 12m totals ─────────────────────────────────────────────────
  const acc = {
    sprayUnits: 0, focUnits: 0, ingresos: 0,
    cogs: 0, focCogs: 0,
    commDelegate: 0, commRec: 0, commKol: 0, commAffiliate: 0, commCoord: 0,
    invoiceCount: 0,
  };
  for (const bkt of Object.values(buckets)) {
    acc.sprayUnits   += bkt.sprayUnits;
    acc.focUnits     += bkt.focUnits;
    acc.ingresos     += bkt.ingresos;
    acc.cogs         += bkt.cogs;
    acc.focCogs      += bkt.focCogs;
    acc.commDelegate += bkt.commDelegate;
    acc.commRec      += bkt.commRec;
    acc.commKol      += bkt.commKol;
    acc.commAffiliate+= bkt.commAffiliate;
    acc.commCoord    += bkt.commCoord;
    acc.invoiceCount += bkt.invoiceCount;
  }
  const acc_grossMargin  = acc.ingresos - acc.cogs - acc.focCogs;
  const acc_totalChain   = acc.commDelegate + acc.commKol + acc.commAffiliate + acc.commCoord;
  const acc_netContrib   = acc_grossMargin - acc_totalChain;
  const acc_netPct       = acc.ingresos > 0 ? (acc_netContrib / acc.ingresos) * 100 : null;
  const acc_grossPct     = acc.ingresos > 0 ? (acc_grossMargin / acc.ingresos) * 100 : null;
  const acc_roi          = acc_totalChain > 0 ? acc.ingresos / acc_totalChain : null;

  // Current period (current month)
  const curKey = `${curYear}-${String(curMonth).padStart(2, "0")}`;
  const curBkt = buckets[curKey] ?? { sprayUnits: 0, focUnits: 0, ingresos: 0, cogs: 0, focCogs: 0, commDelegate: 0, commRec: 0, commKol: 0, commAffiliate: 0, commCoord: 0, invoiceCount: 0, activeClients: new Set() };
  const curGrossMargin = curBkt.ingresos - curBkt.cogs - curBkt.focCogs;
  const curTotalChain  = curBkt.commDelegate + curBkt.commKol + curBkt.commAffiliate + curBkt.commCoord;
  const curNetContrib  = curGrossMargin - curTotalChain;

  // Previous month for KPI delta
  const prevKey = curMonth === 1 ? `${curYear - 1}-12` : `${curYear}-${String(curMonth - 1).padStart(2, "0")}`;
  const prevBkt = buckets[prevKey];
  const deltaUnits = prevBkt && prevBkt.sprayUnits > 0 ? ((curBkt.sprayUnits - prevBkt.sprayUnits) / prevBkt.sprayUnits) * 100 : null;

  // ── Overdue analysis ───────────────────────────────────────────────────────
  const todayMs    = Date.now();
  const vencData   = vencInvs.map(inv => {
    const days = inv.due_date ? Math.max(0, Math.floor((todayMs - new Date(inv.due_date).getTime()) / 86_400_000)) : 0;
    return { ...inv, daysOverdue: days };
  }).sort((a, b) => b.daysOverdue - a.daysOverdue);
  const vencTotal  = vencData.reduce((s, i) => s + i.total, 0);
  const vencMean   = vencData.length > 0 ? vencData.reduce((s, i) => s + i.daysOverdue, 0) / vencData.length : 0;
  const vencMax    = vencData.length > 0 ? vencData[0].daysOverdue : 0;

  // ── Client P&L table ───────────────────────────────────────────────────────
  const clientAgg: Record<string, { name: string; city: string | null; sprayUnits: number; focUnits: number; ingresos: number; cogs: number; focCogs: number; commDelegate: number; commRec: number; commKol: number; commAffiliate: number; commCoord: number; lastInvoice: string; recommenderName: string | null; affiliateName: string | null }> = {};
  for (const cid of contactIds) {
    const cm = cmetaMap[cid];
    const recName = cm?.recommender_id ? (cmetaMap[cm.recommender_id]?.name ?? null) : null;
    clientAgg[cid] = { name: cm?.name ?? cid, city: cm?.city ?? null, sprayUnits: 0, focUnits: 0, ingresos: 0, cogs: 0, focCogs: 0, commDelegate: 0, commRec: 0, commKol: 0, commAffiliate: 0, commCoord: 0, lastInvoice: "", recommenderName: recName, affiliateName: null };
  }

  for (const inv of allInvs) {
    const cid  = inv.contact_id;
    const bkt2 = clientAgg[cid];
    if (!bkt2) continue;
    const meta = cmetaMap[cid] ?? {};
    if (inv.date_paid && inv.date_paid > bkt2.lastInvoice) bkt2.lastInvoice = inv.date_paid;
    bkt2.ingresos += inv.subtotal ?? 0;

    if (meta.recommender_id) {
      const recRate = cmetaMap[meta.recommender_id]?.recommender_rate ?? 0;
      if (recRate > 0) bkt2.commRec += (inv.subtotal ?? 0) * (recRate / 100);
    }
    if (bixgrowMap[inv.id] != null) bkt2.commAffiliate += bixgrowMap[inv.id];
    else if ((meta as { affiliate_id?: string | null }).affiliate_id) bkt2.commAffiliate += (inv.subtotal ?? 0) * AFFILIATE_RATE;

    for (const rp of ((inv.raw?.products ?? []) as RawLine[])) {
      if (!rp.productId) continue;
      const prod = productMap[rp.productId];
      if (!prod) continue;
      const units = Number(rp.units) || 0;
      const price = Number(rp.price) || 0;
      const disc  = Number(rp.discount) || 0;
      const isFoc = price === 0;
      if (isFoc) { bkt2.focUnits += units; bkt2.focCogs += units * sprayCost; }
      else {
        bkt2.sprayUnits  += units;
        bkt2.cogs        += units * sprayCost;
        bkt2.commDelegate += calcLine(units, price, disc, prod.commission_delegate, prod.commission_delegate_type);
        if ((meta as { kol_id?: string | null }).kol_id)         bkt2.commKol   += calcLine(units, price, disc, prod.commission_4, prod.commission_4_type);
        if ((meta as { coordinator_id?: string | null }).coordinator_id) bkt2.commCoord += calcLine(units, price, disc, prod.commission_5, prod.commission_5_type);
      }
    }
  }

  const clientRows = Object.entries(clientAgg).map(([cid, c]) => {
    const grossMargin  = c.ingresos - c.cogs - c.focCogs;
    const totalChain   = c.commDelegate + c.commKol + c.commAffiliate + c.commCoord;
    const netContrib   = grossMargin - totalChain;
    const netPct       = c.ingresos > 0 ? (netContrib / c.ingresos) * 100 : null;
    const ninetyAgo    = new Date(Date.now() - 90 * 86_400_000).toISOString();
    const status: "activo" | "dormido" | "sin-compras" = c.ingresos > 0 && c.lastInvoice >= new Date(Date.UTC(now.getFullYear(), now.getMonth() - 3, 1)).toISOString() ? "activo" : c.ingresos > 0 ? "dormido" : "sin-compras";
    void ninetyAgo;
    return { cid, ...c, grossMargin, totalChain, netContrib, netPct, status };
  }).sort((a, b) => b.netContrib - a.netContrib);

  // ── Active/dormant/new counts for KPI ─────────────────────────────────────
  const activeClients   = clientRows.filter(c => c.status === "activo").length;
  const dormantClients  = clientRows.filter(c => c.status === "dormido").length;
  const curPeriodLabel  = new Date(curYear, curMonth - 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  const curStatus       = delegateStatus(curBkt.sprayUnits);
  const curStatusBadge  = STATUS_BADGE[curStatus];

  // Max billed for bar chart
  const maxBilled = Math.max(...monthList.map(({ year, month }) => buckets[`${year}-${String(month).padStart(2,"0")}`]?.ingresos ?? 0), 1);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6" style={{ background: "#FAF9F7" }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/performance" className="mt-1.5 text-[#6B7280] hover:text-[#5A2E3A] transition-colors shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 4L6 8l4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">{displayName}</h1>
              {d.is_kol && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">KOL</span>}
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${curStatusBadge.cls}`}>{curStatusBadge.label} este mes</span>
              {acc_netPct !== null && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${acc_netPct >= 20 ? "bg-emerald-100 text-emerald-700" : acc_netPct >= 5 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
                  {acc_netPct.toFixed(1)}% margen neto 12m
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-[#6B7280]">
              {d.email ?? ""}{d.email && d.city ? " · " : ""}{d.city ?? ""}
            </p>
            <p className="mt-0.5 text-xs text-[#9CA3AF]">
              {contactIds.size} clientes asignados · {activeClients} activos · {dormantClients} dormidos
            </p>
          </div>
        </div>
        <Link href={`/dashboard/delegados/${id}`} className="h-9 px-4 flex items-center gap-2 text-sm font-semibold border border-[#E5E7EB] rounded-lg bg-white hover:border-[#5A2E3A] hover:text-[#5A2E3A] transition-colors shadow-sm shrink-0">
          Dashboard delegado
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Link>
      </div>

      {/* Overdue alert */}
      {vencData.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 overflow-hidden">
          <div className="px-5 py-3 flex items-center gap-3 border-b border-red-100">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
            <span className="text-sm font-bold text-red-700">{vencData.length} factura{vencData.length !== 1 ? "s" : ""} vencidas · {fmtEuro(vencTotal)} · demora media {Math.round(vencMean)} días · máxima {vencMax} días</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-red-100/50">
                  {["Cliente", "Factura", "Emisión", "Vencimiento", "Días vencida", "Importe"].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-[10px] font-semibold text-red-700 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {vencData.map(inv => (
                  <tr key={inv.id} className="hover:bg-red-100/30">
                    <td className="px-4 py-2 font-medium text-[#0A0A0A]">{inv.contact_name ?? "—"}</td>
                    <td className="px-4 py-2 font-mono text-[#374151]">{inv.doc_number ?? inv.id.slice(0, 8)}</td>
                    <td className="px-4 py-2 text-[#6B7280] whitespace-nowrap">—</td>
                    <td className="px-4 py-2 text-[#6B7280] whitespace-nowrap">{fmtDate(inv.due_date)}</td>
                    <td className="px-4 py-2">
                      <span className={`font-semibold px-1.5 py-0.5 rounded-full text-[10px] ${inv.daysOverdue > 60 ? "bg-red-200 text-red-800" : "bg-red-100 text-red-700"}`}>
                        {inv.daysOverdue} días
                      </span>
                    </td>
                    <td className="px-4 py-2 tabular-nums font-semibold text-red-700">{fmtEuro2(inv.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Waterfall P&L — 12 months accumulated */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
          <h2 className="text-sm font-bold text-[#0A0A0A]">Cuenta de resultados — últimos 12 meses acumulados</h2>
        </div>
        <div className="px-5 py-4 space-y-0">
          {[
            {
              label: "Ingresos (base imponible)",
              value: acc.ingresos, pct: 100,
              cls: "text-[#0A0A0A] font-bold text-lg",
              border: "border-b border-[#E5E7EB] pb-3 mb-3",
              indent: false, sub: false,
            },
            {
              label: `- Coste producto vendido (${acc.sprayUnits} uds × ${fmtEuro2(sprayCost)}/ud)`,
              value: -acc.cogs,
              pct: acc.ingresos > 0 ? (-acc.cogs / acc.ingresos) * 100 : null,
              cls: "text-red-600",
              indent: true, sub: false, border: "",
            },
            acc.focUnits > 0 ? {
              label: `- Coste FOC / muestras (${acc.focUnits} uds gratuitas × ${fmtEuro2(sprayCost)}/ud)`,
              value: -acc.focCogs,
              pct: acc.ingresos > 0 ? (-acc.focCogs / acc.ingresos) * 100 : null,
              cls: "text-amber-600",
              indent: true, sub: false, border: "",
            } : null,
            {
              label: "= Margen bruto",
              value: acc_grossMargin,
              pct: acc_grossPct,
              cls: `font-semibold ${acc_grossMargin >= 0 ? "text-emerald-700" : "text-red-600"}`,
              border: "border-b border-[#E5E7EB] pb-3 mb-3 mt-3",
              indent: false, sub: false,
            },
            {
              label: `- Comisión delegado (${acc.sprayUnits} uds, tasas por producto)`,
              value: -acc.commDelegate,
              pct: acc.ingresos > 0 ? (-acc.commDelegate / acc.ingresos) * 100 : null,
              cls: "text-[#7C3AED]",
              indent: true, sub: false, border: "",
            },
            acc.commRec > 0 ? {
              label: "  ↳ Porción recomendador (incluida en com. delegado, no adicional)",
              value: -acc.commRec,
              pct: acc.ingresos > 0 ? (-acc.commRec / acc.ingresos) * 100 : null,
              cls: "text-amber-500 italic",
              indent: true, sub: true, border: "",
            } : null,
            acc.commKol > 0 ? {
              label: "- Comisión KOL",
              value: -acc.commKol,
              pct: acc.ingresos > 0 ? (-acc.commKol / acc.ingresos) * 100 : null,
              cls: "text-[#7C3AED]",
              indent: true, sub: false, border: "",
            } : null,
            acc.commAffiliate > 0 ? {
              label: "- Comisión afiliados (Bixgrow)",
              value: -acc.commAffiliate,
              pct: acc.ingresos > 0 ? (-acc.commAffiliate / acc.ingresos) * 100 : null,
              cls: "text-blue-600",
              indent: true, sub: false, border: "",
            } : null,
            acc.commCoord > 0 ? {
              label: "- Comisión coordinador",
              value: -acc.commCoord,
              pct: acc.ingresos > 0 ? (-acc.commCoord / acc.ingresos) * 100 : null,
              cls: "text-[#7C3AED]",
              indent: true, sub: false, border: "",
            } : null,
            {
              label: "= Total comisiones pagadas",
              value: -acc_totalChain,
              pct: acc.ingresos > 0 ? (-acc_totalChain / acc.ingresos) * 100 : null,
              cls: "font-semibold text-[#7C3AED]",
              border: "border-b border-[#E5E7EB] pb-3 mb-3 mt-3",
              indent: false, sub: false,
            },
            {
              label: "CONTRIBUCION NETA AL NEGOCIO",
              value: acc_netContrib,
              pct: acc_netPct,
              cls: `font-bold text-xl ${acc_netContrib >= 0 ? "text-emerald-700" : "text-red-600"}`,
              border: "mt-2 pt-2",
              indent: false, sub: false,
            },
          ].filter(Boolean).map((row, i) => {
            const r = row!;
            return (
              <div key={i} className={`flex items-baseline justify-between py-1 ${r.border ?? ""} ${r.sub ? "opacity-70" : ""}`}>
                <span className={`text-sm ${r.indent ? "pl-6" : ""} ${r.cls}`}>{r.label}</span>
                <span className={`tabular-nums text-sm ml-4 shrink-0 ${r.cls}`}>
                  {fmtEuro(r.value)}
                  {r.pct !== null && r.pct !== undefined && (
                    <span className="ml-2 text-xs font-normal text-[#9CA3AF]">({r.pct > 0 ? "+" : ""}{r.pct.toFixed(1)}%)</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
        {acc_roi !== null && (
          <div className="px-5 py-2 bg-[#F9FAFB] border-t border-[#E5E7EB] text-xs text-[#6B7280]">
            ROI sobre comisiones: <strong className={acc_roi >= 10 ? "text-emerald-700" : acc_roi >= 5 ? "text-amber-700" : "text-red-600"}>{acc_roi.toFixed(1)}x</strong>
            <span className="ml-2">— por cada 1€ pagado en comisiones, el negocio recibe {acc_roi.toFixed(1)}€ en ingresos</span>
          </div>
        )}
      </div>

      {/* 6 KPI cards — current period */}
      <div>
        <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">Período actual — {curPeriodLabel}</p>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            {
              label: "Unidades", value: curBkt.sprayUnits.toString(), accent: "#5A2E3A",
              sub: curBkt.focUnits > 0 ? `+${curBkt.focUnits} uds FOC` : (deltaUnits !== null ? `${fmtPct(deltaUnits)} vs mes ant.` : "primer dato"),
              subCls: deltaUnits !== null && deltaUnits >= 0 ? "text-emerald-600" : deltaUnits !== null ? "text-red-600" : "text-[#9CA3AF]",
            },
            {
              label: "Ingresos", value: fmtEuro(curBkt.ingresos), accent: "#2563EB",
              sub: `${curBkt.invoiceCount} facturas cobradas`,
              subCls: "text-[#6B7280]",
            },
            {
              label: "Margen bruto", value: fmtEuro(curGrossMargin), accent: "#059669",
              sub: curBkt.ingresos > 0 ? `${((curGrossMargin / curBkt.ingresos) * 100).toFixed(1)}% sobre ingresos` : "sin datos",
              subCls: curGrossMargin >= 0 ? "text-emerald-600" : "text-red-600",
            },
            {
              label: "Comisiones", value: fmtEuro(curTotalChain), accent: "#7C3AED",
              sub: curBkt.ingresos > 0 ? `${((curTotalChain / curBkt.ingresos) * 100).toFixed(1)}% sobre ingresos` : "—",
              subCls: "text-[#6B7280]",
            },
            {
              label: "Contribucion neta", value: fmtEuro(curNetContrib), accent: curNetContrib >= 0 ? "#059669" : "#DC2626",
              sub: curBkt.ingresos > 0 ? `${((curNetContrib / curBkt.ingresos) * 100).toFixed(1)}% sobre ingresos` : "sin datos",
              subCls: curNetContrib >= 0 ? "text-emerald-600" : "text-red-600",
            },
            {
              label: "Clientes", value: `${curBkt.activeClients.size}/${contactIds.size}`, accent: "#D97706",
              sub: `${activeClients} activos · ${dormantClients} dormidos`,
              subCls: "text-[#6B7280]",
            },
          ].map(({ label, value, accent, sub, subCls }) => (
            <div key={label} className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
              <div style={{ backgroundColor: accent, height: 3 }} />
              <div className="px-4 py-3">
                <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">{label}</p>
                <p className="mt-1 text-lg font-bold text-[#0A0A0A] tabular-nums">{value}</p>
                <p className={`mt-0.5 text-xs tabular-nums ${subCls}`}>{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bar chart + Monthly breakdown table */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#0A0A0A]">Desglose mensual — ultimos 12 meses</h2>
        </div>

        {/* Mini bar chart */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-end gap-1 h-20">
            {monthList.map(({ year, month }) => {
              const k   = `${year}-${String(month).padStart(2, "0")}`;
              const bkt = buckets[k];
              const pct = maxBilled > 0 ? (bkt.ingresos / maxBilled) * 100 : 0;
              const isCur = year === curYear && month === curMonth;
              return (
                <div key={k} className="flex-1 flex flex-col items-center gap-1" title={`${fmtMonth(year,month)}: ${fmtEuro(bkt.ingresos)}`}>
                  <div className="w-full flex flex-col justify-end" style={{ height: 72 }}>
                    <div className="w-full rounded-t-sm" style={{ height: `${Math.max(pct, bkt.ingresos > 0 ? 3 : 0)}%`, backgroundColor: isCur ? "#5A2E3A" : "#E5E7EB", minHeight: bkt.ingresos > 0 ? 2 : 0 }} />
                  </div>
                  <span className="text-[8px] text-[#9CA3AF] leading-none whitespace-nowrap">{fmtMonth(year, month)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-t border-[#F3F4F6]">
            <thead>
              <tr className="bg-[#F9FAFB]">
                {[
                  { h: "Mes",          t: "Mes del período" },
                  { h: "Uds",          t: "Unidades de spray vendidas (precio > 0)" },
                  { h: "FOC",          t: "Unidades entregadas gratis (precio = 0)" },
                  { h: "Ingresos",     t: "Base imponible facturada (sin IVA)" },
                  { h: "COGS",         t: "Coste de producto vendido (spray + FOC)" },
                  { h: "Margen bruto", t: "Ingresos - COGS total" },
                  { h: "MB%",          t: "Margen bruto / Ingresos" },
                  { h: "Com. del.",    t: "Comisión bruta del delegado" },
                  { h: "Com. rec.",    t: "Porcion al recomendador (incluida en com. delegado)" },
                  { h: "Com. afil.",   t: "Comision de afiliados (Bixgrow)" },
                  { h: "Com. total",   t: "Suma de todas las comisiones pagadas por el negocio" },
                  { h: "Contrib.",     t: "Contribucion neta = Margen bruto - Comisiones totales" },
                  { h: "Neto%",        t: "Contribucion neta / Ingresos" },
                  { h: "Fact.",        t: "Numero de facturas cobradas" },
                  { h: "Clientes",     t: "Clientes distintos con factura cobrada" },
                ].map(({ h, t }) => (
                  <th key={h} title={t} className="px-3 py-2 text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap text-right first:text-left cursor-help">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {monthList.slice().reverse().map(({ year, month }, idx, arr) => {
                const k    = `${year}-${String(month).padStart(2, "0")}`;
                const bkt  = buckets[k];
                const isCur = year === curYear && month === curMonth;
                const grossM = bkt.ingresos - bkt.cogs - bkt.focCogs;
                const chain  = bkt.commDelegate + bkt.commKol + bkt.commAffiliate + bkt.commCoord;
                const net    = grossM - chain;
                const hasData = bkt.invoiceCount > 0;

                const prevIdx = idx + 1;
                const prevBktR = prevIdx < arr.length ? buckets[`${arr[prevIdx].year}-${String(arr[prevIdx].month).padStart(2,"0")}`] : null;
                const vsAnt = prevBktR && prevBktR.sprayUnits > 0 ? ((bkt.sprayUnits - prevBktR.sprayUnits) / prevBktR.sprayUnits) * 100 : null;
                void vsAnt;

                return (
                  <tr key={k} className={`${isCur ? "bg-[#FDF8F8]" : "hover:bg-[#F9FAFB]"} ${!hasData ? "opacity-50" : ""}`}>
                    <td className="px-3 py-2 whitespace-nowrap font-medium text-[#374151] sticky left-0 z-10" style={{ background: isCur ? "#FDF8F8" : "white" }}>
                      {new Date(year, month - 1).toLocaleDateString("es-ES", { month: "short", year: "numeric" })}
                      {isCur && <span className="ml-1.5 text-[9px] font-semibold px-1 py-0.5 rounded bg-[#5A2E3A] text-white">actual</span>}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-right font-semibold text-[#0A0A0A]">{bkt.sprayUnits || <span className="text-[#D1D5DB]">—</span>}</td>
                    <td className="px-3 py-2 tabular-nums text-right text-amber-600">{bkt.focUnits || <span className="text-[#D1D5DB]">—</span>}</td>
                    <td className="px-3 py-2 tabular-nums text-right text-[#0A0A0A]">{hasData ? fmtEuro(bkt.ingresos) : <span className="text-[#D1D5DB]">—</span>}</td>
                    <td className="px-3 py-2 tabular-nums text-right text-red-600">{hasData ? fmtEuro(bkt.cogs + bkt.focCogs) : <span className="text-[#D1D5DB]">—</span>}</td>
                    <td className={`px-3 py-2 tabular-nums text-right font-semibold ${grossM >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                      {hasData ? fmtEuro(grossM) : <span className="text-[#D1D5DB] font-normal">—</span>}
                    </td>
                    <td className={`px-3 py-2 tabular-nums text-right text-xs ${grossM >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {hasData && bkt.ingresos > 0 ? `${((grossM / bkt.ingresos) * 100).toFixed(1)}%` : <span className="text-[#D1D5DB]">—</span>}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-right text-[#7C3AED]">{hasData ? fmtEuro(bkt.commDelegate) : <span className="text-[#D1D5DB]">—</span>}</td>
                    <td className="px-3 py-2 tabular-nums text-right text-amber-500 text-[10px]">{bkt.commRec > 0 ? fmtEuro(bkt.commRec) : <span className="text-[#D1D5DB]">—</span>}</td>
                    <td className="px-3 py-2 tabular-nums text-right text-blue-600">{bkt.commAffiliate > 0 ? fmtEuro(bkt.commAffiliate) : <span className="text-[#D1D5DB]">—</span>}</td>
                    <td className="px-3 py-2 tabular-nums text-right text-[#7C3AED] font-semibold">{hasData ? fmtEuro(chain) : <span className="text-[#D1D5DB] font-normal">—</span>}</td>
                    <td className={`px-3 py-2 tabular-nums text-right font-bold ${net >= 0 ? "text-[#0A0A0A]" : "text-red-600"}`}>
                      {hasData ? fmtEuro(net) : <span className="text-[#D1D5DB] font-normal">—</span>}
                    </td>
                    <td className={`px-3 py-2 tabular-nums text-right text-xs ${net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {hasData && bkt.ingresos > 0 ? `${((net / bkt.ingresos) * 100).toFixed(1)}%` : <span className="text-[#D1D5DB]">—</span>}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-right text-[#6B7280]">{bkt.invoiceCount || <span className="text-[#D1D5DB]">—</span>}</td>
                    <td className="px-3 py-2 tabular-nums text-right text-[#6B7280]">{bkt.activeClients.size || <span className="text-[#D1D5DB]">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-[#0A0A0A] text-white text-xs">
                <td className="px-3 py-2 font-semibold">12 meses</td>
                <td className="px-3 py-2 tabular-nums text-right font-bold">{acc.sprayUnits}</td>
                <td className="px-3 py-2 tabular-nums text-right text-amber-300">{acc.focUnits || "—"}</td>
                <td className="px-3 py-2 tabular-nums text-right font-bold">{fmtEuro(acc.ingresos)}</td>
                <td className="px-3 py-2 tabular-nums text-right text-red-300">{fmtEuro(acc.cogs + acc.focCogs)}</td>
                <td className="px-3 py-2 tabular-nums text-right text-emerald-300 font-bold">{fmtEuro(acc_grossMargin)}</td>
                <td className="px-3 py-2 tabular-nums text-right text-emerald-300">{acc_grossPct !== null ? `${acc_grossPct.toFixed(1)}%` : "—"}</td>
                <td className="px-3 py-2 tabular-nums text-right text-purple-300">{fmtEuro(acc.commDelegate)}</td>
                <td className="px-3 py-2 tabular-nums text-right text-amber-300">{acc.commRec > 0 ? fmtEuro(acc.commRec) : "—"}</td>
                <td className="px-3 py-2 tabular-nums text-right text-blue-300">{acc.commAffiliate > 0 ? fmtEuro(acc.commAffiliate) : "—"}</td>
                <td className="px-3 py-2 tabular-nums text-right text-purple-300 font-bold">{fmtEuro(acc_totalChain)}</td>
                <td className={`px-3 py-2 tabular-nums text-right font-bold ${acc_netContrib >= 0 ? "text-emerald-300" : "text-red-300"}`}>{fmtEuro(acc_netContrib)}</td>
                <td className={`px-3 py-2 tabular-nums text-right ${acc_netPct !== null && acc_netPct >= 0 ? "text-emerald-300" : "text-red-300"}`}>{acc_netPct !== null ? `${acc_netPct.toFixed(1)}%` : "—"}</td>
                <td className="px-3 py-2 tabular-nums text-right">{acc.invoiceCount}</td>
                <td className="px-3 py-2 tabular-nums text-right">{contactIds.size}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Client profitability table */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-sm font-bold text-[#0A0A0A]">Rentabilidad por cliente — 12 meses</h2>
          <p className="text-xs text-[#6B7280] mt-0.5">Ordenado por contribucion neta descendente</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                {[
                  { h: "Cliente",        t: "Nombre del cliente" },
                  { h: "Uds",            t: "Unidades de spray vendidas" },
                  { h: "FOC",            t: "Unidades gratis entregadas" },
                  { h: "Ingresos",       t: "Base imponible 12 meses" },
                  { h: "COGS",           t: "Coste de producto" },
                  { h: "Margen bruto",   t: "Ingresos menos COGS" },
                  { h: "MB%",            t: "Margen bruto porcentual" },
                  { h: "Com. total",     t: "Total comisiones pagadas por este cliente" },
                  { h: "Contrib. neta",  t: "Contribucion neta al negocio" },
                  { h: "Neto%",          t: "Contribucion neta porcentual" },
                  { h: "Rec / Afil",     t: "Recomendador y/o afiliado asignado" },
                  { h: "Estado",         t: "Activo=compra <90d, Dormido=>90d, Sin compras=sin historial" },
                ].map(({ h, t }) => (
                  <th key={h} title={t} className="px-3 py-2 text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap text-left cursor-help first:sticky first:left-0 first:z-10 first:bg-[#F9FAFB]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {clientRows.map(c => {
                const statusCfg = {
                  "activo":      { label: "Activo",      cls: "bg-emerald-100 text-emerald-700" },
                  "dormido":     { label: "Dormido",     cls: "bg-amber-100 text-amber-700" },
                  "sin-compras": { label: "Sin compras", cls: "bg-[#F3F4F6] text-[#9CA3AF]" },
                }[c.status];
                return (
                  <tr key={c.cid} className={`hover:bg-[#F9FAFB] ${c.ingresos === 0 ? "opacity-50" : ""}`}>
                    <td className="px-3 py-2 whitespace-nowrap sticky left-0 z-10 bg-white hover:bg-[#F9FAFB]">
                      <Link href={`/dashboard/clientes/${c.cid}`} className="font-medium text-[#0A0A0A] hover:text-[#5A2E3A]">
                        {c.name}
                      </Link>
                      {c.city && <p className="text-[9px] text-[#9CA3AF]">{c.city}</p>}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-right font-semibold text-[#0A0A0A]">{c.sprayUnits || <span className="text-[#D1D5DB]">—</span>}</td>
                    <td className="px-3 py-2 tabular-nums text-right text-amber-600">{c.focUnits || <span className="text-[#D1D5DB]">—</span>}</td>
                    <td className="px-3 py-2 tabular-nums text-right text-[#0A0A0A]">{c.ingresos > 0 ? fmtEuro(c.ingresos) : <span className="text-[#D1D5DB]">—</span>}</td>
                    <td className="px-3 py-2 tabular-nums text-right text-red-600">{c.cogs + c.focCogs > 0 ? fmtEuro(c.cogs + c.focCogs) : <span className="text-[#D1D5DB]">—</span>}</td>
                    <td className={`px-3 py-2 tabular-nums text-right font-semibold ${c.grossMargin >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                      {c.ingresos > 0 ? fmtEuro(c.grossMargin) : <span className="text-[#D1D5DB] font-normal">—</span>}
                    </td>
                    <td className={`px-3 py-2 tabular-nums text-right text-xs ${c.grossMargin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {c.ingresos > 0 ? `${((c.grossMargin / c.ingresos) * 100).toFixed(1)}%` : <span className="text-[#D1D5DB]">—</span>}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-right text-[#7C3AED]">{c.totalChain > 0 ? fmtEuro(c.totalChain) : <span className="text-[#D1D5DB]">—</span>}</td>
                    <td className={`px-3 py-2 tabular-nums text-right font-bold ${c.netContrib >= 0 ? "text-[#0A0A0A]" : "text-red-600"}`}>
                      {c.ingresos > 0 ? fmtEuro(c.netContrib) : <span className="text-[#D1D5DB] font-normal">—</span>}
                    </td>
                    <td className={`px-3 py-2 tabular-nums text-right text-xs ${c.netContrib >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {c.netPct !== null ? `${c.netPct.toFixed(1)}%` : <span className="text-[#D1D5DB]">—</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {c.recommenderName && (
                          <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-amber-50 text-amber-700">{c.recommenderName}</span>
                        )}
                        {c.affiliateName && (
                          <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-blue-50 text-blue-700">{c.affiliateName}</span>
                        )}
                        {!c.recommenderName && !c.affiliateName && <span className="text-[#D1D5DB] text-[9px]">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusCfg.cls}`}>{statusCfg.label}</span>
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
