import Link from "next/link";
import { redirect } from "next/navigation";
import { getClientContact } from "@/lib/clientSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/Badge";
import { orderStatus } from "@/lib/holded/api";
import { fmtEuro, fmtDate } from "@/lib/invoices";

interface DbOrder {
  id: string;
  doc_number: string | null;
  date: string | null;
  total: number;
  status: number;
  shipping_status: number | null;
}

const SHIPPING_LABELS: Record<number, string> = {
  0: "No seleccionado", 1: "Recepcionado", 2: "Preparado", 3: "Facturado", 4: "Enviado", 5: "Recibido",
};

export default async function ClientePedidosPage() {
  const contact = await getClientContact();
  if (!contact) redirect("/login");

  const admin = createAdminClient();
  const { data: ordersData } = await admin
    .from("holded_salesorders")
    .select("id, doc_number, date, total, status, shipping_status")
    .eq("contact_id", contact.id)
    .order("date", { ascending: false });

  const orders = (ordersData ?? []) as DbOrder[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/cliente" className="text-xs text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors">
            ← Volver
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-[#0A0A0A] tracking-tight">Mis pedidos</h1>
        </div>
        <Link
          href="/cliente/pedidos/nuevo"
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#B8860B] text-sm font-semibold text-white hover:bg-[#96700A] transition-colors"
        >
          + Nuevo pedido
        </Link>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
        {orders.length === 0 ? (
          <p className="text-sm text-[#9CA3AF] py-12 text-center">Aún no tienes pedidos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  {["Pedido", "Fecha", "Total", "Estado", "Envío"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {orders.map(o => {
                  const st = orderStatus(o.status);
                  return (
                    <tr key={o.id} className="hover:bg-[#FAFAFA]">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0A0A0A] whitespace-nowrap">
                        {o.doc_number ?? o.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap tabular-nums">{fmtDate(o.date)}</td>
                      <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap tabular-nums">{fmtEuro(o.total)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap text-xs">
                        {o.shipping_status != null ? SHIPPING_LABELS[o.shipping_status] ?? "—" : "—"}
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
