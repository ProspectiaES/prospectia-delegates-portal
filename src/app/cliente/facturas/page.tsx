import Link from "next/link";
import { redirect } from "next/navigation";
import { getClientContact } from "@/lib/clientSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/Badge";
import { fmtEuro, fmtDate, statusLabel, statusVariant, pendingAmount } from "@/lib/invoices";

interface DbInvoice {
  id: string;
  doc_number: string | null;
  date: string | null;
  due_date: string | null;
  total: number;
  status: number;
  is_credit_note: boolean;
  raw: Record<string, unknown> | null;
}

export default async function ClienteFacturasPage() {
  const contact = await getClientContact();
  if (!contact) redirect("/login");

  const admin = createAdminClient();
  const { data } = await admin
    .from("holded_invoices")
    .select("id, doc_number, date, due_date, total, status, is_credit_note, raw")
    .eq("contact_id", contact.id)
    .order("date", { ascending: false });

  const invoices = (data ?? []) as DbInvoice[];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/cliente" className="text-xs text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors">
          ← Volver
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[#0A0A0A] tracking-tight">Mis facturas</h1>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
        {invoices.length === 0 ? (
          <p className="text-sm text-[#9CA3AF] py-12 text-center">Aún no tienes facturas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  {["Factura", "Fecha", "Vencimiento", "Total", "Pendiente", "Estado"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {invoices.map(inv => {
                  const pending = pendingAmount(inv);
                  return (
                    <tr key={inv.id} className="hover:bg-[#FAFAFA]">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0A0A0A] whitespace-nowrap">
                        {inv.doc_number ?? inv.id.slice(0, 8)}
                        {inv.is_credit_note && <span className="ml-1.5 text-[10px] text-[#9CA3AF]">(abono)</span>}
                      </td>
                      <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap tabular-nums">{fmtDate(inv.date)}</td>
                      <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap tabular-nums">{fmtDate(inv.due_date)}</td>
                      <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap tabular-nums">{fmtEuro(inv.total)}</td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                        <span className="font-semibold text-[#0A0A0A]">{fmtEuro(pending)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant[inv.status] ?? "neutral"}>
                          {statusLabel[inv.status] ?? `Estado ${inv.status}`}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
