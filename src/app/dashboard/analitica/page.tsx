import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { SKU_SPRAY, SKUS_PROMO } from "@/lib/skus";
import { DashboardView } from "./DashboardView";

export const metadata = { title: "Cuadro de Mando — Prospectia" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function monthRange(year: number, month: number) {
  return {
    start: new Date(Date.UTC(year, month, 1)).toISOString(),
    end:   new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)).toISOString(),
  };
}

const MONTH_LABELS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

type RawProduct = { productId?: string; sku?: string; units?: number | string; name?: string };
type Invoice = {
  id: string; contact_id: string; status: number;
  date: string; is_credit_note: boolean; from_invoice_id: string | null;
  raw: { subtotal?: number; total?: number; products?: RawProduct[]; items?: RawProduct[] } | null;
};

function extractUnits(inv: Invoice, skuSet: Set<string> | string): number {
  const lines = inv.raw?.products ?? inv.raw?.items ?? [];
  return lines.reduce((s, l) => {
    const sku = l.sku ?? "";
    const match = typeof skuSet === "string" ? sku === skuSet : skuSet.has(sku);
    return s + (match ? Number(l.units ?? 0) : 0);
  }, 0);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AnaliticaPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") notFound();

  const sp  = await searchParams;
  const now = new Date();
  let year  = now.getFullYear();
  let month = now.getMonth(); // 0-indexed

  if (sp.mes && /^\d{4}-\d{2}$/.test(sp.mes)) {
    const [y, m] = sp.mes.split("-").map(Number);
    year = y; month = m - 1;
  }

  const mesStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const isNow  = mesStr === nowStr;

  // ── Fetch window: 13 months back for history + YoY ──────────────────────────
  const windowStart = new Date(Date.UTC(year - 1, month - 1, 1)).toISOString();
  const { end: windowEnd } = monthRange(year, month);

  const admin = createAdminClient();

  const [invoicesRes, creditNotesRes, profilesRes, cdRes, simRes] = await Promise.all([
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
      .select("id, full_name, delegate_name, role, is_kol, is_coordinator, kol_id")
      .in("role", ["DELEGATE", "KOL", "COORDINATOR"]),

    admin.from("contact_delegates").select("contact_id, delegate_id"),

    admin.from("economic_simulations")
      .select("net_sale_price, estructura_pct, logistics_pct, production_cost_lines")
      .eq("is_performance_reference", true)
      .maybeSingle(),
  ]);

  // ── Build exclusion set (credit-noted invoices) ──────────────────────────────
  const cancelled = new Set(
    ((creditNotesRes.data ?? []) as { from_invoice_id: string | null }[])
      .map(r => r.from_invoice_id).filter(Boolean) as string[]
  );

  const allInvoices = ((invoicesRes.data ?? []) as Invoice[])
    .filter(inv => !cancelled.has(inv.id));

  // ── Per-month aggregation (current + 12-month history) ───────────────────────
  const { start: curStart, end: curEnd } = monthRange(year, month);

  // Build first-invoice-per-contact map (for "new client" detection)
  const firstInvoiceDate: Record<string, string> = {};
  for (const inv of allInvoices) {
    const prev = firstInvoiceDate[inv.contact_id];
    if (!prev || inv.date < prev) firstInvoiceDate[inv.contact_id] = inv.date;
  }

  function computeMonthMetrics(start: string, end: string) {
    const invs = allInvoices.filter(i => i.date >= start && i.date <= end);
    const units    = invs.reduce((s, i) => s + extractUnits(i, SKU_SPRAY), 0);
    const focUnits = invs.reduce((s, i) => s + extractUnits(i, SKUS_PROMO), 0);
    // Total billed units across all SKUs (excludes FOC)
    const allUnits = invs.reduce((s, i) => {
      const lines = (i.raw?.products ?? i.raw?.items ?? []) as RawProduct[];
      return s + lines.reduce((ls, l) => ls + Number(l.units ?? 0), 0);
    }, 0) - focUnits;
    const revenue  = invs.reduce((s, i) => s + (i.raw?.subtotal ?? 0), 0);
    const contactIds = new Set(invs.map(i => i.contact_id));
    const newClients = [...contactIds].filter(cid => firstInvoiceDate[cid] >= start).length;
    return { units, focUnits, allUnits, revenue, activeClients: contactIds.size, newClients, count: invs.length };
  }

  const cur = computeMonthMetrics(curStart, curEnd);

  // 12-month history (oldest → newest, ending at current month)
  const history = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 11 + i, 1));
    const y = d.getUTCFullYear(), m = d.getUTCMonth();
    const { start, end } = monthRange(y, m);
    const metrics = computeMonthMetrics(start, end);
    return { label: MONTH_LABELS[m], year: y, month: m + 1, ...metrics };
  });

  // ── Delegates ────────────────────────────────────────────────────────────────
  const delegates  = (profilesRes.data ?? []) as { id: string; full_name: string; delegate_name: string | null; role: string; is_kol: boolean; is_coordinator: boolean; kol_id: string | null }[];
  const cdRows     = (cdRes.data ?? []) as { contact_id: string; delegate_id: string }[];

  const delegateIds   = new Set(delegates.map(d => d.id));
  const kolCount      = delegates.filter(d => d.is_kol || d.role === "KOL").length;
  const coordCount    = delegates.filter(d => d.is_coordinator || d.role === "COORDINATOR").length;
  const totalDelegates = delegateIds.size;

  // Active delegates this month = delegates with ≥1 invoice via their contacts
  const curInvoiceContactIds = new Set(
    allInvoices.filter(i => i.date >= curStart && i.date <= curEnd).map(i => i.contact_id)
  );
  const delegateContactMap: Record<string, Set<string>> = {};
  for (const { delegate_id, contact_id } of cdRows) {
    if (!delegateContactMap[delegate_id]) delegateContactMap[delegate_id] = new Set();
    delegateContactMap[delegate_id].add(contact_id);
  }
  const activeDelegates = delegates.filter(d => {
    const cids = delegateContactMap[d.id] ?? new Set();
    return [...cids].some(cid => curInvoiceContactIds.has(cid));
  }).length;

  // Total clients in cartera
  const totalClientsInCartera = new Set(cdRows.map(r => r.contact_id)).size;

  // ── Top delegates by total units — all products, no SKU filter ───────────────
  const delegateUnits: Record<string, number> = {};
  for (const inv of allInvoices.filter(i => i.date >= curStart && i.date <= curEnd)) {
    const lines = (inv.raw?.products ?? inv.raw?.items ?? []) as RawProduct[];
    const total = lines.reduce((s, l) => s + Number(l.units ?? 0), 0);
    const deleg = cdRows.find(r => r.contact_id === inv.contact_id)?.delegate_id;
    if (deleg) delegateUnits[deleg] = (delegateUnits[deleg] ?? 0) + total;
  }
  const topDelegates = Object.entries(delegateUnits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, units]) => {
      const d = delegates.find(d => d.id === id);
      return { name: d?.delegate_name ?? d?.full_name ?? "—", units };
    });

  // ── Product breakdown (current month) — grouped by name to merge Shopify+local ─
  function normalizeProdName(raw: string) {
    return raw.trim().toLowerCase()
      .replace(/\s*&\s*/g, " and ")   // "Neck & Chin" → "neck and chin"
      .replace(/\s+/g, " ");
  }

  const productMap: Record<string, { displayName: string; skus: Set<string>; units: number }> = {};
  for (const inv of allInvoices.filter(i => i.date >= curStart && i.date <= curEnd)) {
    const lines = (inv.raw?.products ?? inv.raw?.items ?? []) as RawProduct[];
    for (const l of lines) {
      const rawName = (l.name ?? l.sku ?? "Sin nombre").trim();
      const key = normalizeProdName(rawName);
      if (!productMap[key]) productMap[key] = { displayName: rawName, skus: new Set(), units: 0 };
      productMap[key].units += Number(l.units ?? 0);
      if (l.sku) productMap[key].skus.add(l.sku);
    }
  }
  const skuBreakdown = Object.values(productMap)
    .sort((a, b) => b.units - a.units)
    .map(({ displayName, skus, units }) => ({
      name: displayName,
      sku: [...skus].join(" · "),
      units,
    }));

  // ── Economic simulation ───────────────────────────────────────────────────────
  const sim = simRes.data as { net_sale_price?: number; estructura_pct?: number; logistics_pct?: number; production_cost_lines?: { unit_cost?: number }[] } | null;
  const costPerUnit = sim
    ? (sim.production_cost_lines ?? []).reduce((s, l) => s + (l.unit_cost ?? 0), 0)
    : 0;

  // P&L for current month
  const grossMargin = cur.revenue
    - cur.units   * costPerUnit
    - cur.focUnits * costPerUnit
    - cur.revenue * ((sim?.estructura_pct ?? 0) / 100)
    - cur.revenue * ((sim?.logistics_pct  ?? 0) / 100);

  return (
    <DashboardView
      period={{ year, month, label: `${MONTH_LABELS[month]} ${year}`, isNow, mesStr }}
      kpis={{
        units:           cur.units,
        allUnits:        cur.allUnits,
        focUnits:        cur.focUnits,
        revenue:         cur.revenue,
        invoiceCount:    cur.count,
        activeDelegates,
        activeClients:   cur.activeClients,
        newClients:      cur.newClients,
        grossMargin,
      }}
      history={history}
      network={{
        totalDelegates,
        kolCount,
        coordCount,
        totalClients: totalClientsInCartera,
        activeThisMonth: cur.activeClients,
        newThisMonth: cur.newClients,
      }}
      topDelegates={topDelegates}
      skuBreakdown={skuBreakdown}
    />
  );
}
