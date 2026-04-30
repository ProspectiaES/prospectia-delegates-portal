import React from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { buildCommissionBlock } from "@/app/dashboard/delegados/[id]/commissionCalc";
import { AutofacturaPDF, type AutofacturaLine } from "@/lib/pdf/autofactura";

export const runtime = "nodejs";

type CommType = "percent" | "amount";
interface ProductRow {
  id: string; name: string;
  commission_delegate: number | null; commission_delegate_type: CommType;
  commission_recommender: number | null; commission_recommender_type: CommType;
  commission_4: number | null; commission_4_type: CommType;
}

const COMPANY = {
  name:         process.env.COMPANY_NAME         ?? "Prospectia",
  nif:          process.env.COMPANY_NIF          ?? "—",
  address:      process.env.COMPANY_ADDRESS      ?? "—",
  city:         process.env.COMPANY_CITY         ?? "—",
  postal_code:  process.env.COMPANY_POSTAL_CODE  ?? "—",
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile) return new Response("Unauthorized", { status: 401 });

  if (profile.role !== "OWNER" && profile.role !== "ADMIN") return new Response("Forbidden", { status: 403 });

  const body = await req.json().catch(() => ({})) as {
    mes?: string;
    irpf_pct?: number;
    recargo_eq_pct?: number;
  };

  const irpfPct      = Math.max(0, Math.min(100, Number(body.irpf_pct      ?? 0)));
  const recargoEqPct = Math.max(0, Math.min(100, Number(body.recargo_eq_pct ?? 0)));

  const admin = createAdminClient();

  // Delegate profile
  const { data: delegateData } = await admin
    .from("profiles")
    .select("id, full_name, delegate_name, role, is_kol, email, nif, address, city, postal_code, iban, contact_id")
    .eq("id", id)
    .maybeSingle();

  if (!delegateData) return new Response("Not found", { status: 404 });

  // Contact IDs for commission calc
  const { data: cdRows } = await admin
    .from("contact_delegates")
    .select("contact_id")
    .eq("delegate_id", id);

  const contactIds = (cdRows ?? []).map((r) => r.contact_id as string).filter(Boolean);

  // Period
  const now    = new Date();
  let pYear  = now.getFullYear();
  let pMonth = now.getMonth(); // 0-indexed
  if (body.mes && /^\d{4}-\d{2}$/.test(body.mes)) {
    const [y, m] = body.mes.split("-").map(Number);
    pYear = y; pMonth = m - 1;
  }
  const periodStart = new Date(Date.UTC(pYear, pMonth, 1)).toISOString();
  const periodEnd   = new Date(Date.UTC(pYear, pMonth + 1, 0, 23, 59, 59, 999)).toISOString();
  const period      = new Date(pYear, pMonth).toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  // Products
  const { data: allProducts } = await admin
    .from("holded_products")
    .select("id, name, commission_delegate, commission_delegate_type, commission_recommender, commission_recommender_type, commission_4, commission_4_type");

  const productMap: Record<string, ProductRow> = {};
  for (const p of allProducts ?? []) productMap[p.id] = p as ProductRow;

  // Paid invoices + credit notes
  const [paidRes, cnRes, contactsRecRes] = await Promise.all([
    contactIds.length > 0
      ? admin.from("holded_invoices")
          .select("id, doc_number, contact_id, contact_name, date, total, raw")
          .in("contact_id", contactIds).eq("status", 3).eq("is_credit_note", false)
          .gte("date_paid", periodStart).lte("date_paid", periodEnd)
      : Promise.resolve({ data: [] }),
    contactIds.length > 0
      ? admin.from("holded_invoices").select("from_invoice_id")
          .in("contact_id", contactIds).eq("is_credit_note", true).not("from_invoice_id", "is", null)
      : Promise.resolve({ data: [] }),
    contactIds.length > 0
      ? admin.from("holded_contacts").select("id, recommender_id").in("id", contactIds)
      : Promise.resolve({ data: [] }),
  ]);

  type PaidInvoice = { id: string; doc_number: string | null; contact_id: string | null; contact_name: string | null; date: string | null; total: number; raw: Record<string, unknown> };
  const cancelledIds = new Set(((cnRes.data ?? []) as { from_invoice_id: string | null }[]).map(r => r.from_invoice_id).filter(Boolean) as string[]);
  const paidInvoices = ((paidRes.data ?? []) as PaidInvoice[]).filter(inv => !cancelledIds.has(inv.id));

  const recommenderMap: Record<string, string | null> = {};
  for (const c of (contactsRecRes.data ?? []) as { id: string; recommender_id: string | null }[]) {
    recommenderMap[c.id] = c.recommender_id;
  }
  const uniqueRecIds = [...new Set(Object.values(recommenderMap).filter(Boolean))] as string[];
  const recommenderNameMap: Record<string, string> = {};
  if (uniqueRecIds.length > 0) {
    const { data: recData } = await admin.from("holded_contacts").select("id, name").in("id", uniqueRecIds);
    for (const r of recData ?? []) recommenderNameMap[r.id] = r.name;
  }

  const delegateBlock = buildCommissionBlock("Delegado", paidInvoices, productMap, recommenderMap, recommenderNameMap, "delegate");
  const blocks = [delegateBlock];

  // KOL block
  if (delegateData.is_kol) {
    const { data: kolContactsData } = await admin.from("holded_contacts").select("id, recommender_id").eq("kol_id", id);
    const kolContactIds = (kolContactsData ?? [])
      .map((c: { id: string }) => c.id)
      .filter(cid => !delegateData.contact_id || cid !== delegateData.contact_id);
    const kolRecommenderMap: Record<string, string | null> = {};
    for (const c of kolContactsData ?? []) kolRecommenderMap[(c as { id: string; recommender_id: string | null }).id] = (c as { id: string; recommender_id: string | null }).recommender_id;

    let kolPaid: PaidInvoice[] = [];
    if (kolContactIds.length > 0) {
      const [kolPaidRes, kolCnRes] = await Promise.all([
        admin.from("holded_invoices").select("id, doc_number, contact_id, contact_name, date, total, raw")
          .in("contact_id", kolContactIds).eq("status", 3).eq("is_credit_note", false)
          .gte("date_paid", periodStart).lte("date_paid", periodEnd),
        admin.from("holded_invoices").select("from_invoice_id")
          .in("contact_id", kolContactIds).eq("is_credit_note", true).not("from_invoice_id", "is", null),
      ]);
      const kolCancelled = new Set(((kolCnRes.data ?? []) as { from_invoice_id: string | null }[]).map(r => r.from_invoice_id).filter(Boolean) as string[]);
      kolPaid = ((kolPaidRes.data ?? []) as PaidInvoice[]).filter(inv => !kolCancelled.has(inv.id));
    }
    blocks.push(buildCommissionBlock("KOL", kolPaid, productMap, kolRecommenderMap, recommenderNameMap, "kol"));
  }

  // Total commission
  const baseCommission = blocks.reduce((s, b) => s + b.totalNetCommission, 0);
  if (baseCommission <= 0) {
    return new Response("Sin comisiones liquidables para este período", { status: 422 });
  }

  const irpfAmount      = Math.round(baseCommission * irpfPct / 100 * 100) / 100;
  const recargoEqAmount = Math.round(baseCommission * recargoEqPct / 100 * 100) / 100;
  const totalPayable    = Math.round((baseCommission - irpfAmount + recargoEqAmount) * 100) / 100;

  // Build lines for PDF
  const lines: AutofacturaLine[] = [];
  for (const block of blocks) {
    if (block.invoices.length === 0) continue;
    for (const inv of block.invoices) {
      lines.push({
        description: `Comisión ${block.role} — ${inv.docNumber} (${inv.contactName})`,
        amount: inv.netCommission,
      });
    }
  }

  // Next doc number
  const yearStr = String(pYear).slice(-2);
  const prefix = `PO-AF-${yearStr}-`;
  const { data: lastAF } = await admin
    .from("autofacturas")
    .select("doc_number")
    .like("doc_number", `${prefix}%`)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextSeq = 1;
  if (lastAF) {
    const n = parseInt((lastAF as { doc_number: string }).doc_number.slice(prefix.length), 10);
    if (!isNaN(n)) nextSeq = n + 1;
  }
  const docNumber = `${prefix}${String(nextSeq).padStart(4, "0")}`;

  // Insert record
  await admin.from("autofacturas").insert({
    doc_number:        docNumber,
    delegate_id:       id,
    period_year:       pYear,
    period_month:      pMonth + 1,
    irpf_pct:          irpfPct,
    recargo_eq_pct:    recargoEqPct,
    base_commission:   baseCommission,
    irpf_amount:       irpfAmount,
    recargo_eq_amount: recargoEqAmount,
    total_payable:     totalPayable,
    generated_by:      profile.id,
  });

  // Generate PDF
  const element = React.createElement(AutofacturaPDF, {
    docNumber,
    period,
    generatedAt: now.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" }),
    delegate: delegateData,
    company: COMPANY,
    lines,
    baseCommission,
    irpfPct,
    irpfAmount,
    recargoEqPct,
    recargoEqAmount,
    totalPayable,
  });

  const buffer = await renderToBuffer(element as React.ReactElement<DocumentProps>);

  const safeName = (delegateData.delegate_name ?? delegateData.full_name)
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="autofactura-${safeName}-${docNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
