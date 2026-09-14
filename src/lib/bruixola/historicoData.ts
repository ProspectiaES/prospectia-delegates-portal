import { createAdminClient } from "@/lib/supabase/admin";

interface RawLine {
  name?: string;
  sku?: string;
  units?: number | string;
  price?: number | string;
  discount?: number | string;
}

interface InvRow {
  id: string;
  contact_id: string | null;
  date: string;
  total: number | null;
  subtotal: number | null;
  is_credit_note: boolean;
  from_invoice_id: string | null;
  raw: { products?: RawLine[]; items?: RawLine[] } | null;
}

export interface ProductBreakdownRow {
  producto: string;
  intl: number;
  otros: number;
  unidadesIntl: number;
  unidadesOtros: number;
}

export interface HistoricoData {
  totalIntl: number;
  totalOtros: number;
  countIntl: number;
  countOtros: number;
  total: number;
  invoiceCount: number;
  byYear: { year: number; intl: number; otros: number }[];
  byProduct: ProductBreakdownRow[];
  firstDate: Date | null;
  lastDate: Date | null;
}

function normName(s: string): string {
  return s.trim().toLowerCase().replace(/\s*&\s*/g, " and ").replace(/\s+/g, " ");
}

function lineNet(l: RawLine): number {
  const units = Number(l.units ?? 0);
  const price = Number(l.price ?? 0);
  const discount = Number(l.discount ?? 0);
  return units * price * (1 - discount / 100);
}

export async function getHistoricoData(): Promise<HistoricoData> {
  const admin = createAdminClient();

  const [{ data: intlContactsRaw }, { data: invRaw }, { data: creditRaw }] = await Promise.all([
    admin.from("holded_contacts").select("id").eq("is_internacional", true).is("merged_into_id", null),
    admin.from("holded_invoices")
      .select("id, contact_id, date, total, subtotal, is_credit_note, from_invoice_id, raw")
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
  const byProductMap = new Map<string, ProductBreakdownRow>();

  for (const inv of invoices) {
    const isIntl = inv.contact_id ? intlIds.has(inv.contact_id) : false;
    const value = amount(inv);
    const year = new Date(inv.date).getUTCFullYear();
    if (!byYearMap.has(year)) byYearMap.set(year, { intl: 0, otros: 0 });
    const bucket = byYearMap.get(year)!;

    if (isIntl) { totalIntl += value; countIntl++; bucket.intl += value; }
    else { totalOtros += value; countOtros++; bucket.otros += value; }

    const lines = inv.raw?.products ?? inv.raw?.items ?? [];
    for (const l of lines) {
      const rawName = (l.name ?? l.sku ?? "Sin nombre").trim();
      const key = normName(rawName);
      if (!key) continue;
      if (!byProductMap.has(key)) byProductMap.set(key, { producto: rawName, intl: 0, otros: 0, unidadesIntl: 0, unidadesOtros: 0 });
      const p = byProductMap.get(key)!;
      const net = lineNet(l);
      const units = Number(l.units ?? 0);
      if (isIntl) { p.intl += net; p.unidadesIntl += units; }
      else { p.otros += net; p.unidadesOtros += units; }
    }
  }

  const byYear = [...byYearMap.entries()].sort((a, b) => b[0] - a[0]).map(([year, b]) => ({ year, ...b }));
  const byProduct = [...byProductMap.values()].sort((a, b) => (b.intl + b.otros) - (a.intl + a.otros));

  return {
    totalIntl, totalOtros, countIntl, countOtros,
    total: totalIntl + totalOtros,
    invoiceCount: invoices.length,
    byYear,
    byProduct,
    firstDate: invoices[0]?.date ? new Date(invoices[0].date) : null,
    lastDate: invoices[invoices.length - 1]?.date ? new Date(invoices[invoices.length - 1].date) : null,
  };
}
