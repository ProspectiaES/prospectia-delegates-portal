import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import CostLinesClient, { type CostLine } from "./CostLinesClient";
import HoldedExpensesClient, { type PurchaseRow, type SupplierSummary } from "./HoldedExpensesClient";
import BreakEvenSection, { type BreakEvenData } from "./BreakEvenSection";
import ProjectionTable, { type MonthRow } from "./ProjectionTable";

export const metadata = { title: "Pressupost i P&L — Prospectia" };

// ─── Types ────────────────────────────────────────────────────────────────────

type CommType = "percent" | "amount";

interface ProductRow {
  id: string;
  name: string;
  commission_delegate: number | null;
  commission_delegate_type: CommType;
  commission_recommender: number | null;
  commission_recommender_type: CommType;
  commission_4: number | null;
  commission_4_type: CommType;
  cost: number | null;
  price: number;
}

interface RawProduct {
  productId?: string;
  id?: string;
  name?: string;
  sku?: string | null;
  units?: number | string;
  price?: number | string;
  discount?: number | string;
  costPrice?: number | string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcComm(
  units: number, price: number, discount: number,
  rate: number | null, type: CommType
): number {
  if (!rate) return 0;
  const lineNet = units * price * (1 - discount / 100);
  return type === "amount" ? units * rate : (lineNet * rate) / 100;
}

function toMonthly(amount: number, frequency: string): number {
  if (frequency === "trimestral") return amount / 3;
  if (frequency === "anual")      return amount / 12;
  return amount;
}

function monthRange(year: number, month: number) {
  return {
    start: new Date(Date.UTC(year, month, 1)).toISOString(),
    end:   new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)).toISOString(),
  };
}

function normalizeProdName(n: string) {
  return n.trim().toLowerCase().replace(/\s*&\s*/g, " and ").replace(/\s+/g, " ");
}

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const fmtPct = (n: number) =>
  new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n) + " %";

// ─── Supplier auto-categorization ─────────────────────────────────────────────

function autoCategory(name: string): { category: string; exclude_from_pnl: boolean } {
  const n = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (n.includes("llullmar") || n.includes("espai d'empreses") || n.includes("despacho"))
    return { category: "oficina", exclude_from_pnl: false };
  if (n.includes("ases.finan") || n.includes("clot") || n.includes("contable") || n.includes("assessor") || n.includes("gestor"))
    return { category: "gestoria", exclude_from_pnl: false };
  if (n.includes("holded"))
    return { category: "tecnologia", exclude_from_pnl: false };
  if (n.includes("ionos") || n.includes("supabase") || n.includes("anthropic") || n.includes("cloud"))
    return { category: "tecnologia", exclude_from_pnl: false };
  if (n.includes("airpharm") || n.includes("transvisa") || n.includes("dhl") || n.includes("transport") || n.includes("transit") || n.includes("logistic"))
    return { category: "logistica", exclude_from_pnl: false };
  if (n.includes("skyyn") || n.includes("rioja nature") || n.includes("almacen"))
    return { category: "compres", exclude_from_pnl: false };
  if (n.includes("vistaprint") || n.includes("grafiques") || n.includes("graficas") || n.includes("almirall"))
    return { category: "marketing", exclude_from_pnl: false };
  return { category: "altres", exclude_from_pnl: false };
}

// ─── P&L row components ───────────────────────────────────────────────────────

function PnLRow({
  label, value, pct, accent, sub, indent, note,
}: {
  label: string;
  value: number;
  pct?: number;
  accent?: "green" | "red" | "bold";
  sub?: boolean;
  indent?: boolean;
  note?: string;
}) {
  const valueCls =
    accent === "green" ? "text-emerald-600 font-bold" :
    accent === "red"   ? "text-red-600 font-bold" :
    accent === "bold"  ? "text-[#0A0A0A] font-bold" :
    "text-[#374151] font-medium";

  return (
    <div className={`flex items-center justify-between py-2 ${sub ? "border-t border-[#F3F4F6]" : ""}`}>
      <div className={indent ? "pl-4" : ""}>
        <span className={`text-xs ${sub ? "font-semibold text-[#374151]" : "text-[#6B7280]"}`}>{label}</span>
        {note && <span className="ml-2 text-[10px] text-[#9CA3AF] italic">{note}</span>}
      </div>
      <div className="flex items-center gap-3 text-right">
        {pct !== undefined && (
          <span className="text-[10px] text-[#9CA3AF] tabular-nums w-14">{fmtPct(pct)}</span>
        )}
        <span className={`text-sm tabular-nums ${valueCls}`}>{fmtEuro(value)}</span>
      </div>
    </div>
  );
}

function PnLDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-3 pb-1">
      <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-[#E5E7EB]" />
    </div>
  );
}

// ─── Default cost lines (for supplement manual costs not in Holded) ───────────

const DEFAULT_COST_LINES = [
  { concept: "Nòmines i personal",  category: "personal", amount: 0, frequency: "mensual", status: "actiu", notes: "Salaris, autònoms (si no estan a Holded)" },
  { concept: "Seguretat Social",    category: "personal", amount: 0, frequency: "mensual", status: "actiu", notes: "Quotes empresarials SS" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PressupostPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const sp  = await searchParams;
  const now = new Date();

  // Default to previous month
  const defaultYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const defaultMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  let pYear  = defaultYear;
  let pMonth = defaultMonth;

  if (sp.mes && /^\d{4}-\d{2}$/.test(sp.mes)) {
    const [y, m] = sp.mes.split("-").map(Number);
    pYear = y; pMonth = m - 1;
  }

  const mesStr      = `${pYear}-${String(pMonth + 1).padStart(2, "0")}`;
  const prevMes     = pMonth === 0 ? `${pYear - 1}-12` : `${pYear}-${String(pMonth).padStart(2, "0")}`;
  const nextMes     = pMonth === 11 ? `${pYear + 1}-01` : `${pYear}-${String(pMonth + 2).padStart(2, "0")}`;
  const periodLabel = new Date(pYear, pMonth).toLocaleDateString("ca-ES", { month: "long", year: "numeric" });

  const { start: periodStart, end: periodEnd } = monthRange(pYear, pMonth);
  const admin = createAdminClient();

  // ── Parallel fetch ─────────────────────────────────────────────────────────

  const [
    costLinesRes, productsRes,
    paidRes, facturatRes, cnRes,
    purchasesRes, supplierCatsRes,
    delegateNamesRes,
  ] = await Promise.all([
    admin.from("budget_cost_lines")
      .select("id, concept, category, amount, frequency, starts_at, ends_at, status, notes")
      .order("category").order("concept"),

    admin.from("holded_products")
      .select("id, name, price, cost, commission_delegate, commission_delegate_type, commission_recommender, commission_recommender_type, commission_4, commission_4_type")
      .gt("price", 0),

    // Cobrat
    admin.from("holded_invoices")
      .select("id, contact_id, total, raw")
      .eq("status", 3).eq("is_credit_note", false)
      .gte("date_paid", periodStart).lte("date_paid", periodEnd),

    // Facturat
    admin.from("holded_invoices")
      .select("total, doc_number, date")
      .eq("status", 3).eq("is_credit_note", false)
      .gte("date", periodStart).lte("date", periodEnd),

    // Credit notes
    admin.from("holded_invoices")
      .select("doc_num_ref").eq("is_credit_note", true).not("doc_num_ref", "is", null),

    // Purchase invoices this month (not cancelled)
    admin.from("holded_purchases")
      .select("id, doc_number, contact_id, contact_name, date, total, status, description, category, exclude_from_pnl")
      .neq("status", 3)
      .gte("date", periodStart).lte("date", periodEnd)
      .order("total", { ascending: false }),

    // Supplier category overrides
    admin.from("holded_supplier_categories").select("contact_id, category, exclude_from_pnl"),

    // Delegate / KOL names (to auto-exclude autofactures)
    admin.from("profiles").select("full_name, delegate_name").in("role", ["DELEGATE", "KOL", "COORDINATOR"]),
  ]);

  // ── Auto-seed minimal cost lines if empty ──────────────────────────────────

  let costLines: CostLine[] = (costLinesRes.data ?? []) as CostLine[];
  if (costLines.length === 0) {
    await admin.from("budget_cost_lines").insert(DEFAULT_COST_LINES);
    const { data: seeded } = await admin.from("budget_cost_lines")
      .select("id, concept, category, amount, frequency, starts_at, ends_at, status, notes")
      .order("category").order("concept");
    costLines = (seeded ?? []) as CostLine[];
  }

  // ── Build supplier category map ────────────────────────────────────────────

  const supplierCatMap: Record<string, { category: string; exclude_from_pnl: boolean }> = {};
  for (const sc of supplierCatsRes.data ?? []) {
    if (sc.contact_id) supplierCatMap[sc.contact_id] = { category: sc.category, exclude_from_pnl: sc.exclude_from_pnl };
  }

  // Delegate names for auto-exclusion of autofactures
  const delegateNames = new Set<string>();
  for (const d of (delegateNamesRes.data ?? []) as { full_name: string | null; delegate_name: string | null }[]) {
    if (d.full_name) delegateNames.add(d.full_name.toLowerCase().trim());
    if (d.delegate_name) delegateNames.add(d.delegate_name.toLowerCase().trim());
  }

  // ── Process purchases: apply category overrides + auto-cat ─────────────────

  type PurchaseDB = { id: string; doc_number: string | null; contact_id: string | null; contact_name: string | null; date: string | null; total: number; status: number; description: string | null; category: string; exclude_from_pnl: boolean };

  const purchases = (purchasesRes.data ?? []) as PurchaseDB[];

  // Apply categories and collect suppliers that need auto-cat persisted
  const toAutoSave: { contact_id: string; contact_name: string; category: string; exclude_from_pnl: boolean }[] = [];

  const enriched: PurchaseRow[] = purchases.map(p => {
    const override = p.contact_id ? supplierCatMap[p.contact_id] : null;
    if (override) {
      return { ...p, category: override.category, exclude_from_pnl: override.exclude_from_pnl };
    }

    // Auto-categorize if still at default "altres"
    if (p.category === "altres" && p.contact_name) {
      const name = p.contact_name.toLowerCase().trim();
      // Check if it's a delegate autofacture
      const isDelegate = [...delegateNames].some(dn => name.includes(dn) || dn.includes(name));
      const auto = isDelegate
        ? { category: "altres", exclude_from_pnl: true }
        : autoCategory(p.contact_name);

      if (p.contact_id && (auto.category !== "altres" || auto.exclude_from_pnl)) {
        // Mark to save to DB
        toAutoSave.push({ contact_id: p.contact_id, contact_name: p.contact_name, ...auto });
      }
      return { ...p, category: auto.category, exclude_from_pnl: auto.exclude_from_pnl };
    }
    return p;
  });

  // Persist auto-categories (fire and forget — don't block render)
  if (toAutoSave.length > 0) {
    admin.from("holded_supplier_categories").upsert(
      toAutoSave.map(s => ({ ...s, updated_at: new Date().toISOString() })),
      { onConflict: "contact_id" }
    ).then(() => {
      // Also update the purchase rows
      for (const s of toAutoSave) {
        admin.from("holded_purchases")
          .update({ category: s.category, exclude_from_pnl: s.exclude_from_pnl })
          .eq("contact_id", s.contact_id);
      }
    });
  }

  // ── Group purchases by supplier ────────────────────────────────────────────

  const supplierMap: Record<string, SupplierSummary> = {};
  for (const p of enriched) {
    const key = p.contact_id ?? p.contact_name ?? "unknown";
    if (!supplierMap[key]) {
      supplierMap[key] = {
        contact_id:      p.contact_id,
        contact_name:    p.contact_name ?? "Desconegut",
        category:        p.category,
        exclude_from_pnl: p.exclude_from_pnl,
        invoices: [],
        total: 0,
      };
    }
    supplierMap[key].invoices.push(p);
    supplierMap[key].total += p.total;
    // Use most recent row's category/exclude
    supplierMap[key].category        = p.category;
    supplierMap[key].exclude_from_pnl = p.exclude_from_pnl;
  }
  const suppliers = Object.values(supplierMap).sort((a, b) => b.total - a.total);

  // Total included in P&L from Holded
  const totalHoldedExpenses = suppliers
    .filter(s => !s.exclude_from_pnl)
    .reduce((sum, s) => sum + s.total, 0);

  // ── Sales invoices: cobrat + facturat ──────────────────────────────────────

  const cancelledDocs = new Set(
    ((cnRes.data ?? []) as { doc_num_ref: string | null }[])
      .map(r => r.doc_num_ref).filter(Boolean) as string[]
  );

  type InvSummary = { total: number; doc_number: string | null };
  const totalFacturat = ((facturatRes.data ?? []) as InvSummary[])
    .filter(inv => !inv.doc_number || !cancelledDocs.has(inv.doc_number))
    .reduce((s, inv) => s + inv.total, 0);

  type PaidInv = { id: string; contact_id: string | null; total: number; raw: Record<string, unknown> };
  const paidInvoices = (paidRes.data ?? []) as PaidInv[];
  const totalCobrat  = paidInvoices.reduce((s, inv) => s + inv.total, 0);

  // ── Commission + COGS from invoice raw data ────────────────────────────────

  const productMap: Record<string, ProductRow> = {};
  const productByName: Record<string, ProductRow> = {};
  for (const p of (productsRes.data ?? []) as ProductRow[]) {
    productMap[p.id] = p;
    const key = normalizeProdName(p.name);
    if (key && !productByName[key]) productByName[key] = p;
  }

  const invContactIds = [...new Set(paidInvoices.map(inv => inv.contact_id).filter(Boolean))] as string[];
  let contactKolMap: Record<string, string | null>         = {};
  let contactRecommenderMap: Record<string, string | null> = {};
  let recommenderRateMap: Record<string, number>           = {};

  if (invContactIds.length > 0) {
    const { data: cData } = await admin.from("holded_contacts")
      .select("id, kol_id, recommender_id").in("id", invContactIds);
    for (const c of cData ?? []) {
      contactKolMap[c.id]         = c.kol_id;
      contactRecommenderMap[c.id] = c.recommender_id;
    }
    const recIds = [...new Set(Object.values(contactRecommenderMap).filter(Boolean))] as string[];
    if (recIds.length > 0) {
      const { data: rData } = await admin.from("holded_contacts")
        .select("id, recommender_rate").in("id", recIds);
      for (const r of rData ?? []) {
        if (r.recommender_rate != null) recommenderRateMap[r.id] = Number(r.recommender_rate);
      }
    }
  }

  let totalCOGS = 0, totalDelegateCommGross = 0, totalRecommenderDeduct = 0, totalKolComm = 0;
  let cogsLines = 0, totalRawLines = 0;

  for (const inv of paidInvoices) {
    const contactId   = inv.contact_id ?? "";
    const recommenderId = contactRecommenderMap[contactId] ?? null;
    const hasKol        = !!contactKolMap[contactId];
    const rawProducts   = ((inv.raw?.products ?? inv.raw?.items ?? []) as RawProduct[]);

    for (const rp of rawProducts) {
      const prodId    = rp.productId ?? rp.id;
      let product: ProductRow | undefined = prodId ? productMap[prodId] : undefined;
      if (!product && rp.name) product = productByName[normalizeProdName(rp.name)];

      const units     = Number(rp.units)    || 0;
      const price     = Number(rp.price)    || 0;
      const discount  = Number(rp.discount) || 0;
      const costPrice = Number(rp.costPrice) || 0;
      if (price === 0 || units === 0) continue;

      totalRawLines++;
      if (costPrice > 0) { totalCOGS += costPrice * units * (1 - discount / 100); cogsLines++; }

      if (!product) continue;
      const commDel = calcComm(units, price, discount, product.commission_delegate, product.commission_delegate_type ?? "percent");
      totalDelegateCommGross += commDel;

      if (recommenderId) {
        const recRate = recommenderRateMap[recommenderId] ?? product.commission_recommender ?? 0;
        const lineNet = units * price * (1 - discount / 100);
        totalRecommenderDeduct += (lineNet * Number(recRate)) / 100;
      }
      if (hasKol) {
        totalKolComm += calcComm(units, price, discount, product.commission_4, product.commission_4_type ?? "percent");
      }
    }
  }

  const totalComissions = totalDelegateCommGross + totalKolComm;

  // ── Fixed costs (manual supplement — nòmines not in Holded, etc.) ──────────

  const activeCostLines = costLines.filter(l => l.status === "actiu");
  const fixedManualMonthly = activeCostLines.reduce((s, l) => s + toMonthly(l.amount, l.frequency), 0);

  // ── P&L totals ─────────────────────────────────────────────────────────────

  const totalDespeses    = totalHoldedExpenses + fixedManualMonthly;
  const margeBrut        = totalCobrat - totalCOGS - totalComissions;
  const beneficiNet      = margeBrut - totalDespeses;
  const pctCOGS          = totalCobrat > 0 ? totalCOGS / totalCobrat * 100 : 0;
  const pctComissions    = totalCobrat > 0 ? totalComissions / totalCobrat * 100 : 0;
  const pctMargeBrut     = totalCobrat > 0 ? margeBrut / totalCobrat * 100 : 0;
  const pctDespeses      = totalCobrat > 0 ? totalDespeses / totalCobrat * 100 : 0;
  const pctBenefici      = totalCobrat > 0 ? beneficiNet / totalCobrat * 100 : 0;

  // ── Break-even ─────────────────────────────────────────────────────────────

  let weightedMarginSum = 0, weightedPriceSum = 0, productsWithCost = 0;
  for (const p of Object.values(productMap)) {
    if (!p.cost || p.cost <= 0 || p.price <= 0) continue;
    const price = Number(p.price), cost = Number(p.cost);
    const commDel = p.commission_delegate
      ? (p.commission_delegate_type === "percent" ? price * Number(p.commission_delegate) / 100 : Number(p.commission_delegate))
      : 0;
    const commRec = p.commission_recommender
      ? (p.commission_recommender_type === "percent" ? price * Number(p.commission_recommender) / 100 : Number(p.commission_recommender))
      : 0;
    const netMargin = price - cost - commDel - commRec;
    weightedMarginSum += price * (netMargin / price);
    weightedPriceSum  += price;
    productsWithCost++;
  }
  const weightedMarginRate   = weightedPriceSum > 0 ? weightedMarginSum / weightedPriceSum : 0;

  // Break-even based on real Holded expenses + manual supplement
  const plannedMonthlyCosts = costLines
    .filter(l => l.status === "actiu" || l.status === "planificat")
    .reduce((s, l) => s + toMonthly(l.amount, l.frequency), 0);
  const beRevenue            = weightedMarginRate > 0 ? (totalHoldedExpenses + fixedManualMonthly) / weightedMarginRate : 0;
  const beRevenueWithPlanned = weightedMarginRate > 0 ? (totalHoldedExpenses + plannedMonthlyCosts) / weightedMarginRate : 0;

  const breakEvenData: BreakEvenData = {
    fixedMonthlyCosts:    totalHoldedExpenses + fixedManualMonthly,
    plannedMonthlyCosts:  totalHoldedExpenses + plannedMonthlyCosts,
    weightedMarginRate,
    productsWithCost,
    totalProducts: Object.keys(productMap).length,
    beRevenue,
    beRevenueWithPlanned,
  };

  // ── Projection ─────────────────────────────────────────────────────────────

  const twelveMonthsAgo = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 11, 1)).toISOString();

  const [cobratHistRes, facturatHistRes] = await Promise.all([
    admin.from("holded_invoices").select("total, date_paid")
      .eq("status", 3).eq("is_credit_note", false).gte("date_paid", twelveMonthsAgo),
    admin.from("holded_invoices").select("total, date, doc_number")
      .eq("status", 3).eq("is_credit_note", false).gte("date", twelveMonthsAgo),
  ]);

  const cobratByMonth: Record<string, number>   = {};
  const facturatByMonth: Record<string, number> = {};
  for (const inv of (cobratHistRes.data ?? []) as { total: number; date_paid: string }[]) {
    const d   = new Date(inv.date_paid);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    cobratByMonth[key] = (cobratByMonth[key] ?? 0) + inv.total;
  }
  for (const inv of (facturatHistRes.data ?? []) as { total: number; date: string; doc_number: string | null }[]) {
    if (inv.doc_number && cancelledDocs.has(inv.doc_number)) continue;
    const d   = new Date(inv.date);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    facturatByMonth[key] = (facturatByMonth[key] ?? 0) + inv.total;
  }

  const projectionRows: MonthRow[] = [];
  for (let offset = -5; offset <= 6; offset++) {
    const d   = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const y   = d.getFullYear(), m = d.getMonth();
    const key = `${y}-${String(m + 1).padStart(2, "0")}`;
    projectionRows.push({
      label: d.toLocaleDateString("ca-ES", { month: "short", year: "numeric" }),
      yearMonth: key,
      cobrat:   offset > 0 ? null : (cobratByMonth[key] ?? 0),
      facturat: offset > 0 ? null : (facturatByMonth[key] ?? 0),
      beRevenue,
      isCurrentMonth: offset === 0,
    });
  }

  // ── Category subtotals for P&L ─────────────────────────────────────────────

  const holdedByCat: Record<string, number> = {};
  for (const s of suppliers.filter(s => !s.exclude_from_pnl)) {
    holdedByCat[s.category] = (holdedByCat[s.category] ?? 0) + s.total;
  }
  const catPnlOrder = ["personal", "oficina", "gestoria", "tecnologia", "marketing", "logistica", "compres", "altres"];
  const CAT_LABEL: Record<string, string> = {
    personal: "Personal", oficina: "Oficina / Local", gestoria: "Gestoria",
    tecnologia: "Tecnologia", marketing: "Màrqueting", logistica: "Logística",
    compres: "Compres producte", altres: "Altres",
  };
  const manualByCategory: Record<string, number> = {};
  for (const l of activeCostLines) {
    const cat = catPnlOrder.includes(l.category) ? l.category : "altres";
    manualByCategory[cat] = (manualByCategory[cat] ?? 0) + toMonthly(l.amount, l.frequency);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0A0A0A]">Pressupost i P&amp;L</h1>
          <p className="text-sm text-[#6B7280] mt-1">Compte de resultats amb despeses reals de Holded, comissions i COGS.</p>
        </div>
        <div className="flex items-center gap-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-1">
          <Link href={`/dashboard/pressupost?mes=${prevMes}`}
            className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all text-[#6B7280] hover:text-[#0A0A0A]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 12L6 8l4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <span className="px-4 py-1 text-sm font-semibold text-[#0A0A0A] capitalize min-w-[140px] text-center">
            {periodLabel}
          </span>
          <Link href={`/dashboard/pressupost?mes=${nextMes}`}
            className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all text-[#6B7280] hover:text-[#0A0A0A]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 12l4-4-4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>

      {/* ── P&L ──────────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-bold text-[#0A0A0A] mb-4">
          Compte de resultats · <span className="font-normal text-[#6B7280] capitalize">{periodLabel}</span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ingressos + costos variables */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 space-y-1">
            <PnLDivider label="Ingressos" />
            <PnLRow label="Facturat (emès el mes)"  value={totalFacturat} />
            <PnLRow label="Cobrat (pagat el mes)"   value={totalCobrat}   accent="bold" />

            <PnLDivider label="Costos variables · Holded" />
            <PnLRow
              label="− Cost producte venut (COGS)"
              value={-totalCOGS}
              pct={pctCOGS}
              indent
              note={cogsLines < totalRawLines ? `${cogsLines}/${totalRawLines} línies` : undefined}
            />
            <PnLRow label="− Comissions delegats (brut)" value={-totalDelegateCommGross}
              pct={totalCobrat > 0 ? totalDelegateCommGross/totalCobrat*100 : undefined} indent />
            {totalKolComm > 0 && (
              <PnLRow label="− Comissions KOL" value={-totalKolComm}
                pct={totalCobrat > 0 ? totalKolComm/totalCobrat*100 : undefined} indent />
            )}

            <div className="mt-2 pt-2 border-t-2 border-[#0A0A0A]">
              <PnLRow label="= Marge brut" value={margeBrut} pct={pctMargeBrut}
                accent={margeBrut >= 0 ? "green" : "red"} sub />
            </div>
          </div>

          {/* Despeses + resultat */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 space-y-1">
            <PnLDivider label="Despeses · Holded" />
            {catPnlOrder.map(cat =>
              holdedByCat[cat] > 0 ? (
                <PnLRow key={cat} label={`− ${CAT_LABEL[cat]}`} value={-holdedByCat[cat]}
                  pct={totalCobrat > 0 ? holdedByCat[cat]/totalCobrat*100 : undefined} indent />
              ) : null
            )}
            {totalHoldedExpenses === 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1.5 my-1">
                Sense factures de compra registrades a Holded per a {periodLabel}.
              </p>
            )}

            {fixedManualMonthly > 0 && (
              <>
                <PnLDivider label="Despeses manuals" />
                {catPnlOrder.map(cat =>
                  (manualByCategory[cat] ?? 0) > 0 ? (
                    <PnLRow key={cat} label={`− ${CAT_LABEL[cat]}`} value={-(manualByCategory[cat] ?? 0)}
                      pct={totalCobrat > 0 ? (manualByCategory[cat] ?? 0)/totalCobrat*100 : undefined} indent />
                  ) : null
                )}
              </>
            )}

            <PnLRow label="= Total despeses" value={-totalDespeses} pct={pctDespeses} sub />

            <div className="mt-2 pt-2 border-t-2 border-[#0A0A0A]">
              <PnLRow label="= Benefici net estimat" value={beneficiNet} pct={pctBenefici}
                accent={beneficiNet >= 0 ? "green" : "red"} sub />
            </div>

            <div className="pt-3 grid grid-cols-2 gap-2">
              {[
                { label: "COGS / Cobrat",      value: fmtPct(pctCOGS) },
                { label: "Comissions / Cobrat", value: fmtPct(pctComissions) },
                { label: "Marge brut",          value: fmtPct(pctMargeBrut) },
                { label: "Marge net",           value: fmtPct(pctBenefici) },
              ].map(kpi => (
                <div key={kpi.label} className="bg-[#F9FAFB] rounded-lg px-3 py-2">
                  <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">{kpi.label}</p>
                  <p className="text-sm font-bold text-[#0A0A0A] mt-0.5">{kpi.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <hr className="border-[#F3F4F6]" />

      {/* ── Despeses Holded (detall per proveïdor) ──────────────────────────── */}
      <section>
        <HoldedExpensesClient suppliers={suppliers} period={periodLabel} />
      </section>

      <hr className="border-[#F3F4F6]" />

      {/* ── Costos manuals (nòmines, etc. no a Holded) ──────────────────────── */}
      <section>
        <div className="mb-2">
          <p className="text-xs text-[#9CA3AF]">
            Afegeix aquí despeses que <strong>no generen factura a Holded</strong> (nòmines, SS, etc.)
          </p>
        </div>
        <CostLinesClient lines={costLines} />
      </section>

      <hr className="border-[#F3F4F6]" />

      {/* ── Break-even ────────────────────────────────────────────────────────── */}
      <section>
        <BreakEvenSection data={breakEvenData} />
      </section>

      <hr className="border-[#F3F4F6]" />

      {/* ── Projecció ─────────────────────────────────────────────────────────── */}
      <section>
        <ProjectionTable rows={projectionRows} beRevenue={beRevenue} />
      </section>
    </div>
  );
}
