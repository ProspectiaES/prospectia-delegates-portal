import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));

interface InvRow {
  id: string;
  contact_id: string | null;
  date: string;
  total: number | null;
  subtotal: number | null;
  is_credit_note: boolean;
  from_invoice_id: string | null;
}

export default async function HistoricoFacturacionPage() {
  const profile = await getProfile();
  if (!profile || (profile.role !== "OWNER" && profile.role !== "CONSIGLIERE")) {
    redirect("/dashboard");
  }

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
  const byYear = new Map<number, { intl: number; otros: number }>();

  for (const inv of invoices) {
    const isIntl = inv.contact_id ? intlIds.has(inv.contact_id) : false;
    const value = amount(inv);
    const year = new Date(inv.date).getUTCFullYear();
    if (!byYear.has(year)) byYear.set(year, { intl: 0, otros: 0 });
    const bucket = byYear.get(year)!;

    if (isIntl) { totalIntl += value; countIntl++; bucket.intl += value; }
    else { totalOtros += value; countOtros++; bucket.otros += value; }
  }

  const total = totalIntl + totalOtros;
  const years = [...byYear.keys()].sort((a, b) => b - a);
  const firstDate = invoices[0]?.date ? new Date(invoices[0].date) : null;
  const lastDate = invoices[invoices.length - 1]?.date ? new Date(invoices[invoices.length - 1].date) : null;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div>
          <Link href="/dashboard/bruixola" className="text-xs text-[#6B7280] hover:text-[#111827] mb-1 inline-block">← Brúixola</Link>
          <h1 className="text-2xl font-bold text-[#111827]">Facturación histórica</h1>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            {firstDate && lastDate
              ? `Desde ${firstDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" })} hasta ${lastDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" })} · ${invoices.length} facturas`
              : "Sin datos"}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl p-5 border border-[#8E0E1A] bg-[#8E0E1A]">
            <p className="text-xs font-medium mb-1 text-[#FECDD3]">Total facturado</p>
            <p className="text-2xl font-bold text-white">{fmt(total)}</p>
            <p className="text-xs mt-1 font-medium text-[#FCA5A5]">{invoices.length} facturas</p>
          </div>
          <div className="rounded-xl p-5 border border-[#E5E7EB] bg-white shadow-sm">
            <p className="text-xs font-medium mb-1 text-[#6B7280]">Internacional</p>
            <p className="text-2xl font-bold text-[#111827]">{fmt(totalIntl)}</p>
            <p className="text-xs mt-1 font-medium text-[#6B7280]">{pct(totalIntl, total)}% del total · {countIntl} facturas</p>
          </div>
          <div className="rounded-xl p-5 border border-[#E5E7EB] bg-white shadow-sm">
            <p className="text-xs font-medium mb-1 text-[#6B7280]">Otros</p>
            <p className="text-2xl font-bold text-[#111827]">{fmt(totalOtros)}</p>
            <p className="text-xs mt-1 font-medium text-[#6B7280]">{pct(totalOtros, total)}% del total · {countOtros} facturas</p>
          </div>
        </div>

        <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F3F4F6] bg-[#FAFAFA]">
            <p className="text-sm font-semibold text-[#111827]">Por año</p>
            <p className="text-[10px] text-[#9CA3AF] mt-0.5">Base imponible, facturas emitidas (no borrador, no anuladas)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#F3F4F6]">
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Año</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Internacional</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Otros</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F9FAFB]">
                {years.map(year => {
                  const b = byYear.get(year)!;
                  return (
                    <tr key={year} className="hover:bg-[#FAFAFA] transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#111827]">{year}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-[#111827]">{fmt(b.intl)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-[#111827]">{fmt(b.otros)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-[#8E0E1A]">{fmt(b.intl + b.otros)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#E5E7EB] bg-[#F9FAFB]">
                  <td className="px-4 py-3 font-bold text-[#111827]">TOTAL</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-[#111827]">{fmt(totalIntl)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-[#111827]">{fmt(totalOtros)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-[#8E0E1A]">{fmt(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <Link href="/dashboard/bruixola/internacional" className="inline-block text-sm text-[#8E0E1A] hover:underline">Ver detalle mensual Internacional →</Link>
      </div>
    </div>
  );
}
