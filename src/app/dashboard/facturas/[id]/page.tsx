import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  name?: string;
  desc?: string;
  units?: number;
  price?: number;
  tax?: number;
  subtotal?: number;
  total?: number;
  discount?: number;
}

interface Payment {
  date?: number;
  notes?: string;
  amount?: number;
  paymentMethod?: string;
}

interface InvoiceRaw {
  docNumber?: string;
  contactName?: string;
  date?: number;
  dueDate?: number;
  dateLastModified?: number;
  total?: number;
  subtotal?: number;
  tax?: number;
  status?: number;
  desc?: string;
  notes?: string;
  currency?: string;
  language?: string;
  products?: LineItem[];
  items?: LineItem[];
  payments?: Payment[];
  [key: string]: unknown;
}

interface DbInvoice {
  id: string;
  doc_number: string | null;
  contact_id: string | null;
  contact_name: string | null;
  date: string | null;
  due_date: string | null;
  date_last_modified: string | null;
  total: number;
  status: number;
  description: string | null;
  last_synced_at: string;
  raw: InvoiceRaw;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number | undefined) =>
  n == null ? "—" :
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtTs(ts: number | undefined): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const statusLabel: Record<number, string> = { 0: "Borrador", 1: "Pendiente", 2: "Vencida", 3: "Cobrada" };
const statusVariant: Record<number, "neutral" | "warning" | "danger" | "success"> = {
  0: "neutral", 1: "warning", 2: "danger", 3: "success",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FacturaDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("holded_invoices")
    .select("id, doc_number, contact_id, contact_name, date, due_date, date_last_modified, total, status, description, last_synced_at, raw")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  const inv = data as DbInvoice;
  const raw = inv.raw ?? {};
  const lines: LineItem[] = raw.products ?? raw.items ?? [];
  const payments: Payment[] = raw.payments ?? [];
  const isOverdue = inv.status === 2 || (inv.status === 1 && inv.due_date && new Date(inv.due_date) < new Date());

  return (
    <div className="max-w-screen-lg mx-auto px-6 py-8 space-y-6">

      {/* Back + header */}
      <div>
        <Link
          href="/dashboard/facturas"
          className="inline-flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#8E0E1A] transition-colors mb-4"
        >
          ← Volver a facturas
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">
              {inv.doc_number ? `Factura ${inv.doc_number}` : `Factura ${id.slice(0, 10)}…`}
            </h1>
            <p className="mt-1 text-sm text-[#6B7280]">
              {inv.contact_name ?? "Sin cliente"} · Sincronizado {fmtDate(inv.last_synced_at)}
            </p>
          </div>
          <Badge variant={statusVariant[inv.status] ?? "neutral"}>
            {statusLabel[inv.status] ?? `Estado ${inv.status}`}
          </Badge>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total",      value: fmtCurrency(inv.total) },
          { label: "Base imponible", value: fmtCurrency(raw.subtotal) },
          { label: "IVA",        value: fmtCurrency(raw.tax) },
          { label: "Moneda",     value: raw.currency ?? "EUR" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm px-4 py-4">
            <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">{label}</p>
            <p className="mt-1.5 text-xl font-bold text-[#0A0A0A] tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Dates + contact */}
        <Card>
          <CardHeader><CardTitle>Información</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-[#F3F4F6]">
              {[
                { label: "Cliente",     value: inv.contact_name ?? "—" },
                { label: "Fecha",       value: fmtDate(inv.date) },
                { label: "Vencimiento", value: (
                  <span className={isOverdue ? "text-[#8E0E1A] font-medium" : ""}>
                    {fmtDate(inv.due_date)}
                  </span>
                )},
                { label: "Modificado",  value: fmtDate(inv.date_last_modified) },
                { label: "Descripción", value: inv.description ?? raw.desc ?? "—" },
                ...(raw.notes ? [{ label: "Notas", value: raw.notes as string }] : []),
              ].map(({ label, value }) => (
                <li key={label} className="flex items-start justify-between gap-4 px-5 py-3">
                  <span className="text-xs text-[#6B7280] shrink-0 pt-0.5">{label}</span>
                  <span className="text-xs font-medium text-[#0A0A0A] text-right">{value}</span>
                </li>
              ))}
            </ul>
            {inv.contact_id && (
              <div className="px-5 py-3 border-t border-[#F3F4F6]">
                <Link
                  href={`/dashboard/clientes/${inv.contact_id}`}
                  className="text-xs font-medium text-[#8E0E1A] hover:underline"
                >
                  Ver ficha del cliente →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line items */}
        <div className="lg:col-span-2 space-y-6">
          {lines.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Líneas de factura</CardTitle>
                <span className="text-xs text-[#9CA3AF]">{lines.length} línea{lines.length !== 1 ? "s" : ""}</span>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                        {["Concepto", "Uds.", "Precio", "Dto.", "IVA", "Total"].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3F4F6]">
                      {lines.map((line, i) => (
                        <tr key={i} className="hover:bg-[#F9FAFB]">
                          <td className="px-4 py-3">
                            <p className="font-medium text-[#0A0A0A] text-sm">{line.name ?? "—"}</p>
                            {line.desc && <p className="text-xs text-[#6B7280] mt-0.5">{line.desc}</p>}
                          </td>
                          <td className="px-4 py-3 text-[#6B7280] tabular-nums whitespace-nowrap">
                            {line.units ?? 1}
                          </td>
                          <td className="px-4 py-3 tabular-nums whitespace-nowrap text-[#0A0A0A]">
                            {fmtCurrency(line.price)}
                          </td>
                          <td className="px-4 py-3 tabular-nums whitespace-nowrap text-[#6B7280]">
                            {line.discount ? `${line.discount}%` : "—"}
                          </td>
                          <td className="px-4 py-3 tabular-nums whitespace-nowrap text-[#6B7280]">
                            {line.tax != null ? `${line.tax}%` : "—"}
                          </td>
                          <td className="px-4 py-3 tabular-nums whitespace-nowrap font-semibold text-[#0A0A0A] text-right">
                            {fmtCurrency(line.total ?? line.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-[#E5E7EB] bg-[#F9FAFB]">
                        <td colSpan={5} className="px-4 py-3 text-xs text-[#6B7280]">Total factura</td>
                        <td className="px-4 py-3 text-right font-bold text-[#0A0A0A] tabular-nums">
                          {fmtCurrency(inv.total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payments */}
          {payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Cobros registrados</CardTitle>
                <span className="text-xs text-[#9CA3AF]">{payments.length} pago{payments.length !== 1 ? "s" : ""}</span>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-[#F3F4F6]">
                  {payments.map((p, i) => (
                    <li key={i} className="flex items-center justify-between px-5 py-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-[#0A0A0A]">
                          {fmtTs(p.date)}
                          {p.paymentMethod && (
                            <span className="ml-2 text-xs text-[#6B7280]">· {p.paymentMethod}</span>
                          )}
                        </p>
                        {p.notes && <p className="text-xs text-[#6B7280] mt-0.5">{p.notes}</p>}
                      </div>
                      <span className="tabular-nums font-semibold text-emerald-600 shrink-0">
                        {fmtCurrency(p.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
