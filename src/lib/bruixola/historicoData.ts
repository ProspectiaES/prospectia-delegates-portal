import { createAdminClient } from "@/lib/supabase/admin";

interface InvRow {
  id: string;
  contact_id: string | null;
  date: string;
  total: number | null;
  subtotal: number | null;
  is_credit_note: boolean;
  from_invoice_id: string | null;
}

export interface HistoricoData {
  totalIntl: number;
  totalOtros: number;
  countIntl: number;
  countOtros: number;
  total: number;
  invoiceCount: number;
  byYear: { year: number; intl: number; otros: number }[];
  firstDate: Date | null;
  lastDate: Date | null;
}

export async function getHistoricoData(): Promise<HistoricoData> {
  const admin = createAdminClient();

  const [{ data: intlContactsRaw }, { data: invRaw }, { data: creditRaw }] = await Promise.all([
    admin.from("holded_contacts").select("id").eq("is_internacional", true).is("merged_into_id", null),
    admin.from("holded_invoices")
      .select("id, contact_id, date, total, subtotal, is_credit_note, from_invoice_id")
      .in("status", [1, 2, 3])
      .eq("is_credit_note", false)
      .order("date", { ascending: true }),
    admin.from("holded_invoices").select("from_invoice_id").eq("is_credit_note", true).not("from_invoice_id", "is", null),
  ]);

  const intlIds = new Set((intlContactsRaw ?? []).map(c => c.id as string));
  const cancelled = new Set(((creditRaw ?? []) as { from_invoice_id: string | null }[]).map(r => r.from_invoice_id).filter(Boolean) as string[]);
  const invoices = ((invRaw ?? []) as InvRow[]).filter(i => !cancelled.has(i.id));

  const amount = (i: InvRow) => i.subtotal ?? i.total ?? 0;

  let totalIntl = 0, totalOtros = 0, countIntl = 0, countOtros = 0;
  const byYearMap = new Map<number, { intl: number; otros: number }>();

  for (const inv of invoices) {
    const isIntl = inv.contact_id ? intlIds.has(inv.contact_id) : false;
    const value = amount(inv);
    const year = new Date(inv.date).getUTCFullYear();
    if (!byYearMap.has(year)) byYearMap.set(year, { intl: 0, otros: 0 });
    const bucket = byYearMap.get(year)!;

    if (isIntl) { totalIntl += value; countIntl++; bucket.intl += value; }
    else { totalOtros += value; countOtros++; bucket.otros += value; }
  }

  const byYear = [...byYearMap.entries()].sort((a, b) => b[0] - a[0]).map(([year, b]) => ({ year, ...b }));

  return {
    totalIntl, totalOtros, countIntl, countOtros,
    total: totalIntl + totalOtros,
    invoiceCount: invoices.length,
    byYear,
    firstDate: invoices[0]?.date ? new Date(invoices[0].date) : null,
    lastDate: invoices[invoices.length - 1]?.date ? new Date(invoices[invoices.length - 1].date) : null,
  };
}
