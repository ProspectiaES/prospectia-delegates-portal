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
}

interface RawProduct {
  productId?: string;
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
  total: number;
  raw: Record<string, unknown>;
}

function calcLineCommission(
  units: number, price: number, discount: number,
  rate: number | null, type: CommType
): number {
  if (!rate) return 0;
  const lineNet = units * price * (1 - discount / 100);
  return type === "amount" ? units * rate : (lineNet * rate) / 100;
}

export function buildCommissionBlock(
  roleName: string,
  paidInvoices: PaidInvoiceRaw[],
  productMap: Record<string, ProductCommission>,
  recommenderMap: Record<string, string | null>,
  recommenderNameMap: Record<string, string>,
  rateKey: "delegate" | "kol"
): CommissionBlock {
  const invoiceCommissions: InvoiceCommission[] = [];

  for (const inv of paidInvoices) {
    const rawProducts = (inv.raw?.products ?? []) as RawProduct[];
    const lines: CommissionLine[] = [];
    let subtotal = 0;
    let recommenderDeduction = 0;

    const recommenderId = recommenderMap[inv.contact_id ?? ""] ?? null;
    const recommenderName = recommenderId ? (recommenderNameMap[recommenderId] ?? null) : null;

    for (const rp of rawProducts) {
      if (!rp.productId) continue;
      const product = productMap[rp.productId];
      if (!product) continue;

      const units = Number(rp.units) || 0;
      const price = Number(rp.price) || 0;
      const discount = Number(rp.discount) || 0;
      const lineNet = units * price * (1 - discount / 100);

      const commRate = rateKey === "kol"
        ? (product.commission_4 ?? 0)
        : (product.commission_delegate ?? 0);
      const commType: CommType = rateKey === "kol"
        ? (product.commission_4_type ?? "percent")
        : (product.commission_delegate_type ?? "percent");
      const commissionAmount = calcLineCommission(units, price, discount, commRate, commType);

      lines.push({
        productName: rp.name ?? product.name,
        sku: rp.sku ?? null,
        units, unitPrice: price, discountPct: discount, lineNet,
        commissionRate: commRate,
        commissionType: commType,
        commissionAmount,
      });

      subtotal += commissionAmount;

      if (rateKey === "delegate" && recommenderId) {
        const recDeduction = calcLineCommission(
          units, price, discount,
          product.commission_recommender,
          product.commission_recommender_type ?? "percent"
        );
        recommenderDeduction += recDeduction;
      }
    }

    const netCommission = subtotal - recommenderDeduction;

    invoiceCommissions.push({
      invoiceId: inv.id,
      docNumber: inv.doc_number ?? inv.id.slice(0, 8),
      contactId: inv.contact_id,
      contactName: inv.contact_name ?? "—",
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
