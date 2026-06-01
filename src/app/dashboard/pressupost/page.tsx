import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import CostLinesClient, { type CostLine } from "./CostLinesClient";
import BreakEvenSection, { type BreakEvenData } from "./BreakEvenSection";
import ProjectionTable, { type MonthRow } from "./ProjectionTable";

export const metadata = { title: "Pressupost i Projeccions — Prospectia" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PressupostPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const admin = createAdminClient();
  const now   = new Date();

  // ── Fetch data ──────────────────────────────────────────────────────────────

  const [costLinesRes, productsRes] = await Promise.all([
    admin.from("budget_cost_lines")
      .select("id, concept, category, amount, frequency, starts_at, ends_at, status, notes")
      .order("category")
      .order("concept"),
    admin.from("holded_products")
      .select("id, sku, name, price, cost, commission_delegate, commission_delegate_type, commission_recommender, commission_recommender_type")
      .gt("price", 0),
  ]);

  const costLines: CostLine[] = (costLinesRes.data ?? []) as CostLine[];

  // Fetch last 12 months of invoice actuals (cobrat + facturat)
  const twelveMonthsAgo = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 11, 1)).toISOString();

  const [cobratRes, facturatRes, cnRes] = await Promise.all([
    admin.from("holded_invoices")
      .select("total, date_paid")
      .eq("status", 3).eq("is_credit_note", false)
      .gte("date_paid", twelveMonthsAgo),
    admin.from("holded_invoices")
      .select("total, date, doc_number")
      .eq("status", 3).eq("is_credit_note", false)
      .gte("date", twelveMonthsAgo),
    admin.from("holded_invoices")
      .select("doc_num_ref")
      .eq("is_credit_note", true)
      .not("doc_num_ref", "is", null),
  ]);

  const cancelledDocs = new Set(
    ((cnRes.data ?? []) as { doc_num_ref: string | null }[])
      .map(r => r.doc_num_ref).filter(Boolean) as string[]
  );

  // ── Break-even calculation ──────────────────────────────────────────────────

  type Product = {
    price: number;
    cost: number | null;
    commission_delegate: number | null;
    commission_delegate_type: string;
    commission_recommender: number | null;
    commission_recommender_type: string;
  };

  const products = (productsRes.data ?? []) as Product[];

  let weightedMarginSum = 0;
  let weightedPriceSum  = 0;
  let productsWithCost  = 0;

  for (const p of products) {
    if (!p.cost || p.cost <= 0) continue;
    const price = Number(p.price);
    const cost  = Number(p.cost);
    if (price <= 0) continue;

    const commDel = p.commission_delegate
      ? (p.commission_delegate_type === "percent"
          ? price * Number(p.commission_delegate) / 100
          : Number(p.commission_delegate))
      : 0;
    const commRec = p.commission_recommender
      ? (p.commission_recommender_type === "percent"
          ? price * Number(p.commission_recommender) / 100
          : Number(p.commission_recommender))
      : 0;

    const netMargin = price - cost - commDel - commRec;
    const marginRate = netMargin / price;

    weightedMarginSum += price * marginRate;
    weightedPriceSum  += price;
    productsWithCost++;
  }

  const weightedMarginRate = weightedPriceSum > 0 ? weightedMarginSum / weightedPriceSum : 0;

  // Monthly cost totals
  const fixedMonthlyCosts = costLines
    .filter(l => l.status === "actiu")
    .reduce((s, l) => s + toMonthly(l.amount, l.frequency), 0);

  const plannedMonthlyCosts = costLines
    .filter(l => l.status === "actiu" || l.status === "planificat")
    .reduce((s, l) => s + toMonthly(l.amount, l.frequency), 0);

  const beRevenue             = weightedMarginRate > 0 ? fixedMonthlyCosts / weightedMarginRate : 0;
  const beRevenueWithPlanned  = weightedMarginRate > 0 ? plannedMonthlyCosts / weightedMarginRate : 0;

  const breakEvenData: BreakEvenData = {
    fixedMonthlyCosts,
    plannedMonthlyCosts,
    weightedMarginRate,
    productsWithCost,
    totalProducts: products.length,
    beRevenue,
    beRevenueWithPlanned,
  };

  // ── Projection rows (last 6 + next 6 months) ───────────────────────────────

  // Group cobrat by month
  const cobratByMonth: Record<string, number> = {};
  for (const inv of (cobratRes.data ?? []) as { total: number; date_paid: string }[]) {
    const d = new Date(inv.date_paid);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    cobratByMonth[key] = (cobratByMonth[key] ?? 0) + inv.total;
  }

  // Group facturat by month (exclude cancelled)
  const facturatByMonth: Record<string, number> = {};
  for (const inv of (facturatRes.data ?? []) as { total: number; date: string; doc_number: string | null }[]) {
    if (inv.doc_number && cancelledDocs.has(inv.doc_number)) continue;
    const d = new Date(inv.date);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    facturatByMonth[key] = (facturatByMonth[key] ?? 0) + inv.total;
  }

  // Build 12 rows: -6 to +5 relative to current month
  const projectionRows: MonthRow[] = [];
  for (let offset = -5; offset <= 6; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const key = `${y}-${String(m + 1).padStart(2, "0")}`;
    const isFuture = offset > 0;
    const isCurrentMonth = offset === 0;

    projectionRows.push({
      label: d.toLocaleDateString("ca-ES", { month: "short", year: "numeric" }),
      yearMonth: key,
      cobrat:    isFuture ? null : (cobratByMonth[key] ?? 0),
      facturat:  isFuture ? null : (facturatByMonth[key] ?? 0),
      beRevenue,
      isCurrentMonth,
    });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-[#0A0A0A]">Pressupost i Projeccions</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Gestiona els costos estructurals, calcula el punt d&apos;equilibri i projecta la rendibilitat mensual.
        </p>
      </div>

      {/* Block 1: Costos planificats */}
      <section>
        <CostLinesClient lines={costLines} />
      </section>

      {/* Divider */}
      <hr className="border-[#F3F4F6]" />

      {/* Block 2: Break-even */}
      <section>
        <BreakEvenSection data={breakEvenData} />
      </section>

      {/* Divider */}
      <hr className="border-[#F3F4F6]" />

      {/* Block 3: Projection */}
      <section>
        <ProjectionTable rows={projectionRows} beRevenue={beRevenue} />
      </section>
    </div>
  );
}
