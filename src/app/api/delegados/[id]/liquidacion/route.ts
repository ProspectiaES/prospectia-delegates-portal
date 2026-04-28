import React from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { buildCommissionBlock } from "@/app/dashboard/delegados/[id]/commissionCalc";
import { LiquidacionPDF, type PendienteRow, type VencidaRow } from "@/lib/pdf/liquidacion";

export const runtime = "nodejs";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type CommType = "percent" | "amount";

interface ProductRow {
  id: string; name: string;
  commission_delegate: number | null; commission_delegate_type: CommType;
  commission_recommender: number | null; commission_recommender_type: CommType;
  commission_4: number | null; commission_4_type: CommType;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth: must be OWNER or the delegate themselves
  const [profile, supabase, admin] = await Promise.all([
    getProfile(),
    createClient(),
    Promise.resolve(createAdminClient()),
  ]);

  if (!profile) return new Response("Unauthorized", { status: 401 });
  const isOwner = profile.role === "OWNER";
  const isSelf  = profile.id === id;
  if (!isOwner && !isSelf) return new Response("Forbidden", { status: 403 });

  // Delegate profile
  const { data: delegateData } = await admin
    .from("profiles")
    .select("id, full_name, delegate_name, role, is_kol, email, phone, nif, address, city, postal_code, iban")
    .eq("id", id)
    .maybeSingle();

  if (!delegateData) return new Response("Not found", { status: 404 });

  // Contact IDs assigned to this delegate
  const { data: cdRows } = await supabase
    .from("contact_delegates")
    .select("contact_id")
    .eq("delegate_id", id);

  const contactIds = (cdRows ?? []).map((r) => r.contact_id as string).filter(Boolean);

  // Period: from ?mes=YYYY-MM or current calendar month
  const url         = new URL(req.url);
  const mesParam    = url.searchParams.get("mes");
  const now         = new Date();
  let pYear  = now.getFullYear();
  let pMonth = now.getMonth(); // 0-indexed
  if (mesParam && /^\d{4}-\d{2}$/.test(mesParam)) {
    const [y, m] = mesParam.split("-").map(Number);
    pYear = y; pMonth = m - 1;
  }
  const periodStart = new Date(Date.UTC(pYear, pMonth, 1)).toISOString();
  const periodEnd   = new Date(Date.UTC(pYear, pMonth + 1, 0, 23, 59, 59, 999)).toISOString();
  const period      = new Date(pYear, pMonth).toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  // Products map
  const { data: allProducts } = await admin
    .from("holded_products")
    .select("id, name, commission_delegate, commission_delegate_type, commission_recommender, commission_recommender_type, commission_4, commission_4_type");

  const productMap: Record<string, ProductRow> = {};
  for (const p of allProducts ?? []) productMap[p.id] = p as ProductRow;

  // Paid invoices this month + credit notes + pending/overdue (delegate contacts)
  const [paidRes, cnRes, contactsRecRes, pendienteRes, vencidaRes] = await Promise.all([
    contactIds.length > 0
      ? supabase
          .from("holded_invoices")
          .select("id, doc_number, contact_id, contact_name, date, total, raw")
          .in("contact_id", contactIds)
          .eq("status", 3)
          .eq("is_credit_note", false)
          .gte("date", periodStart)
          .lte("date", periodEnd)
      : Promise.resolve({ data: [] }),
    contactIds.length > 0
      ? supabase
          .from("holded_invoices")
          .select("doc_num_ref")
          .in("contact_id", contactIds)
          .eq("is_credit_note", true)
          .not("doc_num_ref", "is", null)
      : Promise.resolve({ data: [] }),
    contactIds.length > 0
      ? supabase
          .from("holded_contacts")
          .select("id, recommender_id")
          .in("id", contactIds)
      : Promise.resolve({ data: [] }),
    contactIds.length > 0
      ? supabase
          .from("holded_invoices")
          .select("id, doc_number, contact_id, contact_name, total, due_date")
          .in("contact_id", contactIds)
          .eq("status", 1)
          .order("due_date", { ascending: true })
      : Promise.resolve({ data: [] }),
    contactIds.length > 0
      ? supabase
          .from("holded_invoices")
          .select("id, doc_number, contact_id, contact_name, total, due_date")
          .in("contact_id", contactIds)
          .eq("status", 2)
          .order("due_date", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  type PaidInvoice = { id: string; doc_number: string | null; contact_id: string | null; contact_name: string | null; date: string | null; total: number; raw: Record<string, unknown> };

  const cancelledDocs = new Set(
    ((cnRes.data ?? []) as { doc_num_ref: string | null }[])
      .map((r) => r.doc_num_ref).filter(Boolean) as string[]
  );

  const paidInvoices = ((paidRes.data ?? []) as PaidInvoice[])
    .filter((inv) => !inv.doc_number || !cancelledDocs.has(inv.doc_number));

  const recommenderMap: Record<string, string | null> = {};
  for (const c of (contactsRecRes.data ?? []) as { id: string; recommender_id: string | null }[]) {
    recommenderMap[c.id] = c.recommender_id;
  }

  // Recommender names
  const recIds = [...new Set(Object.values(recommenderMap).filter(Boolean))] as string[];
  const recommenderNameMap: Record<string, string> = {};
  if (recIds.length > 0) {
    const { data: recData } = await supabase.from("holded_contacts").select("id, name").in("id", recIds);
    for (const r of recData ?? []) recommenderNameMap[r.id] = r.name;
  }

  // Build pending / overdue row arrays
  type InvStatusRow = { id: string; doc_number: string | null; contact_id: string | null; contact_name: string | null; total: number; due_date: string | null };

  const pendientes: PendienteRow[] = ((pendienteRes.data ?? []) as InvStatusRow[]).map((inv) => ({
    invoiceId: inv.id,
    docNumber: inv.doc_number ?? inv.id.slice(0, 8),
    contactName: inv.contact_name ?? "—",
    total: inv.total,
    dueDate: inv.due_date ?? null,
    daysUntilDue: inv.due_date
      ? Math.floor((new Date(inv.due_date).getTime() - now.getTime()) / 86_400_000)
      : null,
  }));

  const vencidas: VencidaRow[] = ((vencidaRes.data ?? []) as InvStatusRow[]).map((inv) => ({
    invoiceId: inv.id,
    docNumber: inv.doc_number ?? inv.id.slice(0, 8),
    contactName: inv.contact_name ?? "—",
    total: inv.total,
    dueDate: inv.due_date ?? "—",
    daysOverdue: inv.due_date
      ? Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / 86_400_000)
      : 0,
  })).sort((a, b) => b.daysOverdue - a.daysOverdue);

  const delegateBlock = buildCommissionBlock(
    "Delegado", paidInvoices, productMap, recommenderMap, recommenderNameMap, "delegate"
  );
  const blocks = [delegateBlock];

  // KOL block if applicable
  if (delegateData.is_kol) {
    const { data: kolContactsData } = await supabase
      .from("holded_contacts")
      .select("id, recommender_id")
      .eq("kol_id", id);

    const kolContactIds = (kolContactsData ?? []).map((c: { id: string }) => c.id);
    const kolRecommenderMap: Record<string, string | null> = {};
    for (const c of kolContactsData ?? []) {
      kolRecommenderMap[(c as { id: string; recommender_id: string | null }).id] =
        (c as { id: string; recommender_id: string | null }).recommender_id;
    }

    let kolPaid: PaidInvoice[] = [];
    if (kolContactIds.length > 0) {
      const [kolPaidRes, kolCnRes] = await Promise.all([
        supabase
          .from("holded_invoices")
          .select("id, doc_number, contact_id, contact_name, date, total, raw")
          .in("contact_id", kolContactIds)
          .eq("status", 3)
          .eq("is_credit_note", false)
          .gte("date", periodStart)
          .lte("date", periodEnd),
        supabase
          .from("holded_invoices")
          .select("doc_num_ref")
          .in("contact_id", kolContactIds)
          .eq("is_credit_note", true)
          .not("doc_num_ref", "is", null),
      ]);
      const kolCancelledDocs = new Set(
        ((kolCnRes.data ?? []) as { doc_num_ref: string | null }[])
          .map((r) => r.doc_num_ref).filter(Boolean) as string[]
      );
      kolPaid = ((kolPaidRes.data ?? []) as PaidInvoice[])
        .filter((inv) => !inv.doc_number || !kolCancelledDocs.has(inv.doc_number));
    }

    blocks.push(
      buildCommissionBlock("KOL", kolPaid, productMap, kolRecommenderMap, recommenderNameMap, "kol")
    );
  }

  // Generate PDF
  const element = React.createElement(LiquidacionPDF, {
    delegate: delegateData,
    blocks,
    period,
    pendientes,
    vencidas,
    generatedAt: now.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" }),
  });

  const buffer = await renderToBuffer(element as React.ReactElement<DocumentProps>);

  const safeName = (delegateData.delegate_name ?? delegateData.full_name)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "-")
    .toLowerCase();

  const monthSlug = `${String(pMonth + 1).padStart(2, "0")}-${pYear}`;

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="liquidacion-${safeName}-${monthSlug}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
