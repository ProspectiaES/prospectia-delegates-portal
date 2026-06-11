import type { CommissionLine, InvoiceCommission, CommissionBlock } from "./ComisionesCard";

type CommType = "percent" | "amount";

interface ProductCommission {
  id: string;
  name: string;
  commission_delegate: number | null;
  commission_delegate_type: CommType;
  commission_recommender: number | null;
  commission_recommender_type: CommType;
  commission_4: number | null;
  commission_4_type: CommType;
  // Si informat, delegat i recomendador calculen sobre aquest preu base (€)
  // en lloc del preu de la línia de factura.
  // Exemple: OBE-SPRAY-04 → 31€ (les comissions no es calculen sobre 45€ PVP)
  commission_base_eur?: number | null;
}

interface RawProduct {
  productId?: string;
  id?: string;
  name?: string;
  sku?: string | null;
  units?: number | string;
  price?: number | string;
  discount?: number | string;
}

interface PaidInvoiceRaw {
  id: string;
  doc_number: string | null;
  contact_id: string | null;
  contact_name: string | null;
  date: string | null;
  total: number;
  raw: Record<string, unknown>;
}

/**
 * Calcula la comissió per a una línia de producte.
 *
 * Si el producte té `commission_base_eur`, s'usa com a preu base
 * per al càlcul percentual en lloc del preu real de la factura.
 * Exemple: OBE-SPRAY-04 (31€ base vs 45€ PVP)
 */
function calcLineCommission(
  units: number,
  price: number,
  discount: number,
  rate: number | null,
  type: CommType,
  commissionBaseEur?: number | null  // optional price override per product
): number {
  if (!rate) return 0;
  // Use the product's commission base if set; otherwise use invoice price
  const effectivePrice = (commissionBaseEur != null && commissionBaseEur > 0)
    ? commissionBaseEur
    : price;
  const lineNet = units * effectivePrice * (1 - discount / 100);
  return type === "amount" ? units * rate : (lineNet * rate) / 100;
}

function normalizeProdName(n: string): string {
  return n.trim().toLowerCase().replace(/\s*&\s*/g, " and ").replace(/\s+/g, " ");
}

export function buildCommissionBlock(
  roleName: string,
  paidInvoices: PaidInvoiceRaw[],
  productMap: Record<string, ProductCommission>,
  recommenderMap: Record<string, string | null>,
  recommenderNameMap: Record<string, string>,
  rateKey: "delegate" | "kol",
  recommenderRateMap: Record<string, number> = {}
): CommissionBlock {
  // Secondary lookup by normalised name — covers invoices created without productId
  const productByName: Record<string, ProductCommission> = {};
  for (const p of Object.values(productMap)) {
    const key = normalizeProdName(p.name);
    if (key && !productByName[key]) productByName[key] = p;
  }

  const invoiceCommissions: InvoiceCommission[] = [];

  for (const inv of paidInvoices) {
    const rawProducts = (inv.raw?.products ?? inv.raw?.items ?? []) as RawProduct[];
    const lines: CommissionLine[] = [];
    let subtotal = 0;
    let recommenderDeduction = 0;

    const recommenderId = recommenderMap[inv.contact_id ?? ""] ?? null;
    const recommenderName = recommenderId ? (recommenderNameMap[recommenderId] ?? null) : null;

    for (const rp of rawProducts) {
      const prodId = rp.productId ?? rp.id;
      let product: ProductCommission | undefined = prodId ? productMap[prodId] : undefined;
      if (!product && rp.name) product = productByName[normalizeProdName(rp.name)];
      if (!product) continue;

      const units    = Number(rp.units)    || 0;
      const price    = Number(rp.price)    || 0;
      if (price === 0) continue; // promotional — no commission
      const discount = Number(rp.discount) || 0;

      // Effective commission base: product override or invoice price
      const base = (product.commission_base_eur != null && product.commission_base_eur > 0)
        ? product.commission_base_eur
        : price;
      const lineNet = units * base * (1 - discount / 100);

      const commRate = rateKey === "kol"
        ? (product.commission_4 ?? 0)
        : (product.commission_delegate ?? 0);
      const commType: CommType = rateKey === "kol"
        ? (product.commission_4_type ?? "percent")
        : (product.commission_delegate_type ?? "percent");

      // KOL always on invoice price (commission_4 uses PVP, not the custom base)
      const commissionAmount = rateKey === "kol"
        ? calcLineCommission(units, price, discount, commRate, commType)
        : calcLineCommission(units, price, discount, commRate, commType, product.commission_base_eur);

      lines.push({
        productName: rp.name ?? product.name,
        sku: rp.sku ?? null,
        units, unitPrice: price, discountPct: discount, lineNet,
        commissionRate: commRate,
        commissionType: commType,
        commissionAmount,
      });

      subtotal += commissionAmount;

      // Recommender deduction — also uses product's commission base if set
      if (rateKey === "delegate" && recommenderId) {
        const recRate = recommenderRateMap[recommenderId] ?? product.commission_recommender;
        const recDeduction = calcLineCommission(
          units, price, discount,
          recRate,
          "percent",
          product.commission_base_eur  // recomendador també usa la base del producte
        );
        recommenderDeduction += recDeduction;
      }
    }

    const netCommission = subtotal - recommenderDeduction;

    const paymentsDetail = inv.raw?.paymentsDetail as Array<{ date?: number }> | null | undefined;
    const lastPayment = paymentsDetail && paymentsDetail.length > 0
      ? paymentsDetail[paymentsDetail.length - 1]
      : null;
    const paidAt = lastPayment && typeof lastPayment.date === "number"
      ? new Date(lastPayment.date * 1000).toISOString()
      : null;

    invoiceCommissions.push({
      invoiceId: inv.id,
      docNumber: inv.doc_number ?? inv.id.slice(0, 8),
      contactId: inv.contact_id,
      contactName: inv.contact_name ?? "—",
      invoiceDate: inv.date ?? null,
      paidAt,
      invoiceTotal: inv.total,
      lines,
      subtotalCommission: subtotal,
      recommenderName,
      recommenderDeduction,
      netCommission,
    });
  }

  return {
    role: roleName,
    invoices: invoiceCommissions,
    totalNetCommission: invoiceCommissions.reduce((s, inv) => s + inv.netCommission, 0),
  };
}
