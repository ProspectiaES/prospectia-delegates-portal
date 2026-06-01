import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import CostLinesClient, { type CostLine } from "./CostLinesClient";
import BreakEvenSection, { type BreakEvenData } from "./BreakEvenSection";
import ProjectionTable, { type MonthRow } from "./ProjectionTable";

export const metadata = { title: "Pressupost i P&L — Prospectia" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const fmtPct = (n: number, digits = 1) =>
  new Intl.NumberFormat("es-ES", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n) + " %";

// ─── Default cost lines seed ──────────────────────────────────────────────────

const DEFAULT_COST_LINES = [
  { concept: "Nòmines i personal",           category: "personal",   amount: 0, frequency: "mensual", status: "actiu",      notes: "Salaris, autònoms, freelancers" },
  { concept: "Seguretat Social",             category: "personal",   amount: 0, frequency: "mensual", status: "actiu",      notes: "Quotes empresarials SS" },
  { concept: "Holded ERP",                   category: "tecnologia", amount: 0, frequency: "mensual", status: "actiu",      notes: null },
  { concept: "Portal Prospectia",            category: "tecnologia", amount: 0, frequency: "mensual", status: "actiu",      notes: "VPS + Supabase + CDN" },
  { concept: "Eines SaaS (altres)",          category: "tecnologia", amount: 0, frequency: "mensual", status: "actiu",      notes: null },
  { concept: "Publicitat digital",           category: "marketing",  amount: 0, frequency: "mensual", status: "actiu",      notes: "Meta Ads, Google Ads…" },
  { concept: "Materials i disseny",          category: "marketing",  amount: 0, frequency: "mensual", status: "actiu",      notes: "Fotografia, impressió, creativitats" },
  { concept: "Transport i enviaments",       category: "logistica",  amount: 0, frequency: "mensual", status: "actiu",      notes: null },
  { concept: "Emmagatzematge i estoc",       category: "logistica",  amount: 0, frequency: "mensual", status: "actiu",      notes: null },
  { concept: "Assessoria comptable/fiscal",  category: "altres",     amount: 0, frequency: "mensual", status: "actiu",      notes: null },
  { concept: "Assegurances",                 category: "altres",     amount: 0, frequency: "mensual", status: "actiu",      notes: null },
  { concept: "Oficina / local",              category: "altres",     amount: 0, frequency: "mensual", status: "actiu",      notes: null },
];

// ─── PnL row component ────────────────────────────────────────────────────────

function PnLRow({
  label, value, pct, accent, sub, indent, note,
}: {
  label: string;
  value: number;
  pct?: number;
  accent?: "green" | "red" | "gray" | "bold";
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

  const mesStr  = `${pYear}-${String(pMonth + 1).padStart(2, "0")}`;
  const prevMes = pMonth === 0 ? `${pYear - 1}-12` : `${pYear}-${String(pMonth).padStart(2, "0")}`;
  const nextMes = pMonth === 11 ? `${pYear + 1}-01` : `${pYear}-${String(pMonth + 2).padStart(2, "0")}`;
  const periodLabel = new Date(pYear, pMonth).toLocaleDateString("ca-ES", { month: "long", year: "numeric" });

  const { start: periodStart, end: periodEnd } = monthRange(pYear, pMonth);
  const admin = createAdminClient();

  // ── Fetch everything in parallel ───────────────────────────────────────────

  const [costLinesRes, productsRes, paidRes, facturatRes, cnRes] = await Promise.all([
    admin.from("budget_cost_lines")
      .select("id, concept, category, amount, frequency, starts_at, ends_at, status, notes")
      .order("category").order("concept"),

    admin.from("holded_products")
      .select("id, name, price, cost, commission_delegate, commission_delegate_type, commission_recommender, commission_recommender_type, commission_4, commission_4_type")
      .gt("price", 0),

    // Cobrat: paid this month
    admin.from("holded_invoices")
      .select("id, contact_id, total, raw")
      .eq("status", 3).eq("is_credit_note", false)
      .gte("date_paid", periodStart).lte("date_paid", periodEnd),

    // Facturat: emeses this month
    admin.from("holded_invoices")
      .select("total, doc_number, date")
      .eq("status", 3).eq("is_credit_note", false)
      .gte("date", periodStart).lte("date", periodEnd),

    // Credit notes (for cancellation exclusion)
    admin.from("holded_invoices")
      .select("doc_num_ref")
      .eq("is_credit_note", true)
      .not("doc_num_ref", "is", null),
  ]);

  let costLines: CostLine[] = (costLinesRes.data ?? []) as CostLine[];

  // Auto-seed defaults if empty
  if (costLines.length === 0) {
    await admin.from("budget_cost_lines").insert(DEFAULT_COST_LINES);
    const { data: seeded } = await admin.from("budget_cost_lines")
      .select("id, concept, category, amount, frequency, starts_at, ends_at, status, notes")
      .order("category").order("concept");
    costLines = (seeded ?? []) as CostLine[];
  }

  // ── Build product maps ─────────────────────────────────────────────────────

  const productMap: Record<string, ProductRow> = {};
  const productByName: Record<string, ProductRow> = {};
  for (const p of (productsRes.data ?? []) as ProductRow[]) {
    productMap[p.id] = p;
    const key = normalizeProdName(p.name);
    if (key && !productByName[key]) productByName[key] = p;
  }

  // ── Cancelled docs set ────────────────────────────────────────────────────

  const cancelledDocs = new Set(
    ((cnRes.data ?? []) as { doc_num_ref: string | null }[])
      .map(r => r.doc_num_ref).filter(Boolean) as string[]
  );

  // ── Facturat total ─────────────────────────────────────────────────────────

  type InvSummary = { total: number; doc_number: string | null };
  const totalFacturat = ((facturatRes.data ?? []) as InvSummary[])
    .filter(inv => !inv.doc_number || !cancelledDocs.has(inv.doc_number))
    .reduce((s, inv) => s + inv.total, 0);

  // ── Cobrat: get contact assignments for commission/KOL calc ───────────────

  type PaidInv = { id: string; contact_id: string | null; total: number; raw: Record<string, unknown> };
  const paidInvoices = (paidRes.data ?? []) as PaidInv[];

  const totalCobrat = paidInvoices.reduce((s, inv) => s + inv.total, 0);

  // Fetch contact KOL+recommender data for commission accuracy
  const invContactIds = [...new Set(paidInvoices.map(inv => inv.contact_id).filter(Boolean))] as string[];
  let contactKolMap: Record<string, string | null> = {};
  let contactRecommenderMap: Record<string, string | null> = {};
  let recommenderRateMap: Record<string, number> = {};

  if (invContactIds.length > 0) {
    const { data: contactData } = await admin
      .from("holded_contacts")
      .select("id, kol_id, recommender_id")
      .in("id", invContactIds);

    for (const c of contactData ?? []) {
      contactKolMap[c.id]         = c.kol_id;
      contactRecommenderMap[c.id] = c.recommender_id;
    }

    const recIds = [...new Set(Object.values(contactRecommenderMap).filter(Boolean))] as string[];
    if (recIds.length > 0) {
      const { data: recData } = await admin
        .from("holded_contacts")
        .select("id, recommender_rate")
        .in("id", recIds);
      for (const r of recData ?? []) {
        if (r.recommender_rate != null) recommenderRateMap[r.id] = Number(r.recommender_rate);
      }
    }
  }

  // ── Compute P&L variable costs from invoice raw data ──────────────────────

  let totalCOGS              = 0;
  let totalDelegateCommGross = 0;
  let totalRecommenderDeduct = 0;
  let totalKolComm           = 0;
  let cogsLines              = 0;
  let totalRawLines          = 0;

  for (const inv of paidInvoices) {
    const rawProducts = ((inv.raw?.products ?? inv.raw?.items ?? []) as RawProduct[]);
    const contactId   = inv.contact_id ?? "";
    const recommenderId = contactRecommenderMap[contactId] ?? null;
    const hasKol        = !!contactKolMap[contactId];

    for (const rp of rawProducts) {
      const prodId = rp.productId ?? rp.id;
      let product: ProductRow | undefined = prodId ? productMap[prodId] : undefined;
      if (!product && rp.name) product = productByName[normalizeProdName(rp.name)];

      const units    = Number(rp.units)    || 0;
      const price    = Number(rp.price)    || 0;
      const discount = Number(rp.discount) || 0;
      const costPrice = Number(rp.costPrice) || 0;
      if (price === 0 || units === 0) continue;

      totalRawLines++;

      // COGS from Holded costPrice
      if (costPrice > 0) {
        totalCOGS += costPrice * units * (1 - discount / 100);
        cogsLines++;
      }

      if (!product) continue;

      // Delegate commission
      const commDel = calcComm(units, price, discount, product.commission_delegate, product.commission_delegate_type ?? "percent");
      totalDelegateCommGross += commDel;

      // Recommender deduction (from delegate's cut)
      if (recommenderId) {
        const recRate = recommenderRateMap[recommenderId] ?? product.commission_recommender ?? 0;
        const lineNet = units * price * (1 - discount / 100);
        totalRecommenderDeduct += (lineNet * Number(recRate)) / 100;
      }

      // KOL commission (commission_4)
      if (hasKol) {
        const commKol = calcComm(units, price, discount, product.commission_4, product.commission_4_type ?? "percent");
        totalKolComm += commKol;
      }
    }
  }

  const totalDelegateCommNet = totalDelegateCommGross - totalRecommenderDeduct;
  const totalComissions      = totalDelegateCommGross + totalKolComm; // gross to Prospectia

  // ── Fixed costs ───────────────────────────────────────────────────────────

  const activeCostLines = costLines.filter(l => l.status === "actiu");
  const fixedMonthlyCosts = activeCostLines.reduce((s, l) => s + toMonthly(l.amount, l.frequency), 0);
  const plannedMonthlyCosts = costLines
    .filter(l => l.status === "actiu" || l.status === "planificat")
    .reduce((s, l) => s + toMonthly(l.amount, l.frequency), 0);

  // Group fixed costs by category for display
  const catOrder = ["personal", "tecnologia", "marketing", "logistica", "altres"];
  const costByCategory: Record<string, number> = {};
  for (const cat of catOrder) costByCategory[cat] = 0;
  for (const l of activeCostLines) {
    const cat = catOrder.includes(l.category) ? l.category : "altres";
    costByCategory[cat] = (costByCategory[cat] ?? 0) + toMonthly(l.amount, l.frequency);
  }

  // ── P&L derived metrics ───────────────────────────────────────────────────

  const margeBrut     = totalCobrat - totalCOGS - totalComissions;
  const beneficiNet   = margeBrut - fixedMonthlyCosts;
  const pctCOGS       = totalCobrat > 0 ? totalCOGS / totalCobrat * 100 : 0;
  const pctComissions = totalCobrat > 0 ? totalComissions / totalCobrat * 100 : 0;
  const pctMargeBrut  = totalCobrat > 0 ? margeBrut / totalCobrat * 100 : 0;
  const pctBenefici   = totalCobrat > 0 ? beneficiNet / totalCobrat * 100 : 0;

  // ── Break-even from products ──────────────────────────────────────────────

  let weightedMarginSum = 0;
  let weightedPriceSum  = 0;
  let productsWithCost  = 0;
  for (const p of Object.values(productMap)) {
    if (!p.cost || p.cost <= 0 || p.price <= 0) continue;
    const price = Number(p.price);
    const cost  = Number(p.cost);
    const commDel = p.commission_delegate
      ? (p.commission_delegate_type === "percent" ? price * Number(p.commission_delegate) / 100 : Number(p.commission_delegate))
      : 0;
    const commRec = p.commission_recommender
      ? (p.commission_recommender_type === "percent" ? price * Number(p.commission_recommender) / 100 : Number(p.commission_recommender))
      : 0;
    const netMargin  = price - cost - commDel - commRec;
    weightedMarginSum += price * (netMargin / price);
    weightedPriceSum  += price;
    productsWithCost++;
  }
  const weightedMarginRate     = weightedPriceSum > 0 ? weightedMarginSum / weightedPriceSum : 0;
  const beRevenue              = weightedMarginRate > 0 ? fixedMonthlyCosts / weightedMarginRate : 0;
  const beRevenueWithPlanned   = weightedMarginRate > 0 ? plannedMonthlyCosts / weightedMarginRate : 0;

  const breakEvenData: BreakEvenData = {
    fixedMonthlyCosts, plannedMonthlyCosts,
    weightedMarginRate, productsWithCost,
    totalProducts: Object.keys(productMap).length,
    beRevenue, beRevenueWithPlanned,
  };

  // ── Projection rows (last 6 actual + next 6) ──────────────────────────────

  const twelveMonthsAgo = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 11, 1)).toISOString();

  const [cobratHistRes, facturatHistRes] = await Promise.all([
    admin.from("holded_invoices")
      .select("total, date_paid")
      .eq("status", 3).eq("is_credit_note", false)
      .gte("date_paid", twelveMonthsAgo),
    admin.from("holded_invoices")
      .select("total, date, doc_number")
      .eq("status", 3).eq("is_credit_note", false)
      .gte("date", twelveMonthsAgo),
  ]);

  const cobratByMonth: Record<string, number>   = {};
  const facturatByMonth: Record<string, number> = {};

  for (const inv of (cobratHistRes.data ?? []) as { total: number; date_paid: string }[]) {
    const d = new Date(inv.date_paid);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    cobratByMonth[key] = (cobratByMonth[key] ?? 0) + inv.total;
  }
  for (const inv of (facturatHistRes.data ?? []) as { total: number; date: string; doc_number: string | null }[]) {
    if (inv.doc_number && cancelledDocs.has(inv.doc_number)) continue;
    const d = new Date(inv.date);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    facturatByMonth[key] = (facturatByMonth[key] ?? 0) + inv.total;
  }

  const projectionRows: MonthRow[] = [];
  for (let offset = -5; offset <= 6; offset++) {
    const d   = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const y   = d.getFullYear();
    const m   = d.getMonth();
    const key = `${y}-${String(m + 1).padStart(2, "0")}`;
    const isFuture       = offset > 0;
    const isCurrentMonth = offset === 0;
    projectionRows.push({
      label: d.toLocaleDateString("ca-ES", { month: "short", year: "numeric" }),
      yearMonth: key,
      cobrat:   isFuture ? null : (cobratByMonth[key] ?? 0),
      facturat: isFuture ? null : (facturatByMonth[key] ?? 0),
      beRevenue,
      isCurrentMonth,
    });
  }

  // ── Category labels ──────────────────────────────────────────────────────

  const CAT_LABEL: Record<string, string> = {
    personal:   "Personal",
    tecnologia: "Tecnologia",
    marketing:  "Màrqueting",
    logistica:  "Logística",
    altres:     "Altres",
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">

      {/* ── Header + month nav ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0A0A0A]">Pressupost i P&amp;L</h1>
          <p className="text-sm text-[#6B7280] mt-1">Compte de resultats, costos fixos, break-even i projecció.</p>
        </div>
        <div className="flex items-center gap-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-1">
          <Link
            href={`/dashboard/pressupost?mes=${prevMes}`}
            className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all text-[#6B7280] hover:text-[#0A0A0A]"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 12L6 8l4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <span className="px-4 py-1 text-sm font-semibold text-[#0A0A0A] capitalize min-w-[140px] text-center">
            {periodLabel}
          </span>
          <Link
            href={`/dashboard/pressupost?mes=${nextMes}`}
            className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all text-[#6B7280] hover:text-[#0A0A0A]"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 12l4-4-4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>

      {/* ── Compte de resultats ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-bold text-[#0A0A0A] mb-4">Compte de resultats · <span className="capitalize font-normal text-[#6B7280]">{periodLabel}</span></h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left: ingressos + variables */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 space-y-1">
            <PnLDivider label="Ingressos" />
            <PnLRow label="Facturat (emès el mes)"  value={totalFacturat} pct={totalCobrat > 0 ? totalFacturat/totalCobrat*100 : undefined} />
            <PnLRow label="Cobrat (pagat el mes)"   value={totalCobrat}   accent="bold" />

            <PnLDivider label="Costos variables · Holded" />
            <PnLRow
              label="− Cost producte venut (COGS)"
              value={-totalCOGS}
              pct={pctCOGS}
              indent
              note={cogsLines < totalRawLines ? `${cogsLines}/${totalRawLines} línies amb cost` : undefined}
            />
            <PnLRow label="− Comissions delegats (brut)" value={-totalDelegateCommGross} pct={totalCobrat > 0 ? totalDelegateCommGross/totalCobrat*100 : undefined} indent />
            {totalKolComm > 0 && (
              <PnLRow label="− Comissions KOL" value={-totalKolComm} pct={totalCobrat > 0 ? totalKolComm/totalCobrat*100 : undefined} indent />
            )}
            {totalRecommenderDeduct > 0 && (
              <PnLRow label="  (incl. pagament recomendadors)" value={-totalRecommenderDeduct} indent note="inclòs en comissions delegats" />
            )}

            <div className="mt-2 pt-2 border-t-2 border-[#0A0A0A]">
              <PnLRow
                label="= Marge brut"
                value={margeBrut}
                pct={pctMargeBrut}
                accent={margeBrut >= 0 ? "green" : "red"}
                sub
              />
            </div>
          </div>

          {/* Right: costos fixos + resultat */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 space-y-1">
            <PnLDivider label="Costos fixos (pressupost)" />
            {catOrder.map(cat => (
              costByCategory[cat] > 0 ? (
                <PnLRow
                  key={cat}
                  label={`− ${CAT_LABEL[cat]}`}
                  value={-costByCategory[cat]}
                  pct={totalCobrat > 0 ? costByCategory[cat]/totalCobrat*100 : undefined}
                  indent
                />
              ) : null
            ))}
            {fixedMonthlyCosts === 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 my-2">
                Omple els costos fixos a la taula de sota per veure el resultat real.
              </p>
            )}
            <PnLRow label="= Total costos fixos" value={-fixedMonthlyCosts} sub />

            <PnLDivider label="Resultat" />
            <PnLRow
              label="Marge brut"
              value={margeBrut}
              pct={pctMargeBrut}
            />
            <PnLRow label="− Costos fixos" value={-fixedMonthlyCosts} indent />
            <div className="mt-2 pt-2 border-t-2 border-[#0A0A0A]">
              <PnLRow
                label="= Benefici net estimat"
                value={beneficiNet}
                pct={pctBenefici}
                accent={beneficiNet >= 0 ? "green" : "red"}
                sub
              />
            </div>

            {/* KPI chips */}
            <div className="pt-3 grid grid-cols-2 gap-2">
              {[
                { label: "COGS / Cobrat",       value: fmtPct(pctCOGS) },
                { label: "Comissions / Cobrat",  value: fmtPct(pctComissions) },
                { label: "Marge brut",           value: fmtPct(pctMargeBrut) },
                { label: "Marge net",            value: fmtPct(pctBenefici) },
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

      {/* ── Costos fixos (editable) ─────────────────────────────────────────── */}
      <section>
        <CostLinesClient lines={costLines} />
      </section>

      <hr className="border-[#F3F4F6]" />

      {/* ── Break-even ──────────────────────────────────────────────────────── */}
      <section>
        <BreakEvenSection data={breakEvenData} />
      </section>

      <hr className="border-[#F3F4F6]" />

      {/* ── Projecció ───────────────────────────────────────────────────────── */}
      <section>
        <ProjectionTable rows={projectionRows} beRevenue={beRevenue} />
      </section>
    </div>
  );
}
