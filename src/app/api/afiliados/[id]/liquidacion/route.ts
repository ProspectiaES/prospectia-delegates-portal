import React from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { AutofacturaPDF, type AutofacturaLine } from "@/lib/pdf/autofactura";

export const runtime = "nodejs";

const COMPANY = {
  name:        process.env.COMPANY_NAME        ?? "Prospectia",
  nif:         process.env.COMPANY_NIF         ?? "—",
  address:     process.env.COMPANY_ADDRESS     ?? "—",
  city:        process.env.COMPANY_CITY        ?? "—",
  postal_code: process.env.COMPANY_POSTAL_CODE ?? "—",
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile || (profile.role !== "OWNER" && profile.role !== "ADMIN")) {
    return new Response("Forbidden", { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as {
    mes?: string;
    irpf_pct?: number;
    recargo_eq_pct?: number;
    dry_run?: boolean;
    generate_autofactura?: boolean;
  };

  const isDryRun           = body.dry_run === true;
  const generateAutofactura = body.generate_autofactura === true;
  const irpfPct            = Math.max(0, Math.min(100, Number(body.irpf_pct      ?? 0)));
  const recargoEqPct       = Math.max(0, Math.min(100, Number(body.recargo_eq_pct ?? 0)));

  const admin = createAdminClient();

  // Affiliate data
  const { data: affData } = await admin
    .from("bixgrow_affiliates")
    .select("id, email, first_name, last_name, wants_autofactura")
    .eq("id", id)
    .maybeSingle();
  if (!affData) return new Response("Not found", { status: 404 });

  // Period
  const now = new Date();
  let pYear  = now.getFullYear();
  let pMonth = now.getMonth();
  if (body.mes && /^\d{4}-\d{2}$/.test(body.mes)) {
    const [y, m] = body.mes.split("-").map(Number);
    pYear = y; pMonth = m - 1;
  }
  const periodStart = new Date(Date.UTC(pYear, pMonth, 1)).toISOString();
  const periodEnd   = new Date(Date.UTC(pYear, pMonth + 1, 0, 23, 59, 59, 999)).toISOString();
  const period      = new Date(pYear, pMonth).toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  // Contacts associated with this affiliate via orders
  const { data: orders } = await admin
    .from("bixgrow_orders")
    .select("contact_id")
    .eq("affiliate_id", id)
    .not("contact_id", "is", null);
  const contactIds = [...new Set((orders ?? []).map(o => o.contact_id as string))];

  if (contactIds.length === 0) {
    return new Response("Sin clientes asociados a este afiliado", { status: 422 });
  }

  // Emitted invoices (status > 0, not credit notes) in period for those contacts
  const { data: invoices } = await admin
    .from("holded_invoices")
    .select("id, doc_number, contact_name, date, subtotal")
    .in("contact_id", contactIds)
    .gt("status", 0)
    .eq("is_credit_note", false)
    .gte("date", periodStart)
    .lte("date", periodEnd);

  const invoiceList = invoices ?? [];
  const totalBase   = invoiceList.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
  const COMMISSION_RATE = 0.20;
  const baseCommission  = Math.round(totalBase * COMMISSION_RATE * 100) / 100;

  if (baseCommission <= 0) {
    return new Response("Sin facturas emitidas en este período", { status: 422 });
  }

  const ivaPct          = 21;
  const ivaAmount       = Math.round(baseCommission * ivaPct / 100 * 100) / 100;
  const irpfAmount      = Math.round(baseCommission * irpfPct / 100 * 100) / 100;
  const recargoEqAmount = Math.round(baseCommission * recargoEqPct / 100 * 100) / 100;
  const totalPayable    = Math.round((baseCommission + ivaAmount - irpfAmount + recargoEqAmount) * 100) / 100;

  const lines: AutofacturaLine[] = [
    {
      description: `Comisión afiliado 20% s/base imponible facturas emitidas — ${period}`,
      amount: baseCommission,
    },
  ];

  const affName = [affData.first_name, affData.last_name].filter(Boolean).join(" ") || affData.email;

  if (isDryRun) {
    return Response.json({
      period, lines,
      invoiceCount: invoiceList.length,
      totalBase,
      baseCommission, ivaPct, ivaAmount,
      irpfPct, irpfAmount,
      recargoEqPct, recargoEqAmount,
      totalPayable,
      wantsAutofactura: (affData as Record<string, unknown>).wants_autofactura ?? false,
    });
  }

  // Doc number
  let docNumber = `LIQ-AF-${pYear}-${String(pMonth + 1).padStart(2, "0")}`;

  if (generateAutofactura) {
    const yearStr = String(pYear).slice(-2);
    const prefix  = `PO-AF-${yearStr}-`;
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
    docNumber = `${prefix}${String(nextSeq).padStart(4, "0")}`;

    await admin.from("autofacturas").insert({
      doc_number:        docNumber,
      affiliate_id:      id,
      period_year:       pYear,
      period_month:      pMonth + 1,
      iva_pct:           ivaPct,
      iva_amount:        ivaAmount,
      irpf_pct:          irpfPct,
      recargo_eq_pct:    recargoEqPct,
      base_commission:   baseCommission,
      irpf_amount:       irpfAmount,
      recargo_eq_amount: recargoEqAmount,
      total_payable:     totalPayable,
      generated_by:      profile.id,
    });
  }

  const element = React.createElement(AutofacturaPDF, {
    docNumber,
    period,
    generatedAt: now.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" }),
    delegate: {
      full_name:     affName,
      delegate_name: null,
      nif:           null,
      address:       null,
      city:          null,
      postal_code:   null,
      iban:          null,
      email:         affData.email,
    },
    company: COMPANY,
    lines,
    baseCommission,
    ivaPct,
    ivaAmount,
    irpfPct,
    irpfAmount,
    recargoEqPct,
    recargoEqAmount,
    totalPayable,
  });

  const buffer = await renderToBuffer(element as React.ReactElement<DocumentProps>);

  const safeName = affName
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  const fileType = generateAutofactura ? "autofactura" : "liquidacion";

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileType}-afiliado-${safeName}-${docNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
