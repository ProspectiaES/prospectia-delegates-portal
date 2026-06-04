import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { orderStatus } from "@/lib/holded/api";
import { MrwTrackingCell } from "@/components/MrwTrackingCell";

const ETAPA: Record<number, string> = {
  0: "—",
  1: "Recepcionado",
  2: "Preparado",
  3: "Facturado",
  4: "Enviado",
  5: "Recibido",
};

const ETAPA_STYLE: Record<number, string> = {
  0: "text-[#9CA3AF]",
  1: "text-blue-600",
  2: "text-amber-600",
  3: "text-purple-600",
  4: "text-cyan-600",
  5: "text-emerald-600 font-semibold",
};

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function PedidosPage() {
  const [supabase, profile] = await Promise.all([createClient(), getProfile()]);
  const isOwner = ["OWNER", "ADMIN"].includes(profile?.role ?? "");

  let contactIds: string[] | null = null;
  if (profile?.role === "DELEGATE") {
    const admin = createAdminClient();
    const { data: links } = await admin
      .from("contact_delegates")
      .select("contact_id")
      .eq("delegate_id", profile.id);
    contactIds = (links ?? []).map(r => r.contact_id as string);
  }

  let query = supabase
    .from("holded_salesorders")
    .select("id, doc_number, contact_id, contact_name, date, total, status, shipping_status, tracking_company_name, tracking_number, tracking_pickup_date, tracking_delivery_date, mrw_tracking_number, mrw_status, mrw_delivered_at, mrw_last_event", { count: "exact" })
    .or("shipping_status.is.null,shipping_status.lt.5")
    .order("date", { ascending: false });

  if (contactIds !== null) {
    if (contactIds.length === 0) {
      return (
        <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Pedidos en curso</h1>
              <p className="mt-1 text-sm text-[#6B7280]">Sin pedidos en curso</p>
            </div>
            <Link href="/dashboard/pedidos/nuevo" className="h-9 px-4 rounded-lg bg-[#8E0E1A] text-sm font-semibold text-white hover:bg-[#6B0A14] transition-colors shadow-sm flex items-center">
              + Nuevo pedido
            </Link>
          </div>
          <Card><CardContent className="py-12 text-center"><p className="text-sm text-[#6B7280]">Aún no tienes pedidos.</p></CardContent></Card>
        </div>
      );
    }
    query = query.in("contact_id", contactIds);
  }

  const { data, count } = await query;
  const orders = data ?? [];

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Pedidos en curso</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            {count != null && count > 0 ? `${count} pedido${count !== 1 ? "s" : ""} abiertos` : "Sin pedidos en curso"}
          </p>
        </div>
        <Link href="/dashboard/pedidos/nuevo" className="h-9 px-4 rounded-lg bg-[#8E0E1A] text-sm font-semibold text-white hover:bg-[#6B0A14] transition-colors shadow-sm flex items-center">
          + Nuevo pedido
        </Link>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <p className="text-sm font-medium text-[#0A0A0A]">No hay pedidos en curso.</p>
            <Link href="/dashboard/pedidos/nuevo" className="text-xs font-medium text-[#8E0E1A] hover:underline">
              Crear el primer pedido →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  {["Pedido", "Cliente", "Fecha", "Importe", "Estado", "Etapa", "Seguimiento", "MRW", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {orders.map(o => {
                  const st = orderStatus(o.status);
                  const etapa = o.shipping_status ?? 0;
                  const hasTracking = !!(o.tracking_number || o.tracking_company_name);
                  const canEdit = o.status === 0; // Borrador → editable
                  return (
                    <tr key={o.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-[#0A0A0A] whitespace-nowrap">
                        {o.doc_number ?? <span className="text-[#D1D5DB]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-[#374151] max-w-[200px] truncate">{o.contact_name ?? "—"}</td>
                      <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">{fmtDate(o.date)}</td>
                      <td className="px-4 py-3 tabular-nums font-semibold text-[#0A0A0A] whitespace-nowrap">{fmtEuro(o.total)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={st.variant === "success" ? "success" : st.variant === "warning" ? "warning" : "neutral"}>
                          {st.label}
                        </Badge>
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-xs font-medium ${ETAPA_STYLE[etapa] ?? "text-[#6B7280]"}`}>
                        {ETAPA[etapa] ?? "—"}
                      </td>
                      <td className="px-4 py-3 min-w-[180px]">
                        {hasTracking ? (
                          <div className="space-y-0.5">
                            {o.tracking_company_name && (
                              <p className="text-xs font-semibold text-[#374151] uppercase tracking-wide">{o.tracking_company_name}</p>
                            )}
                            {o.tracking_number && (
                              <p className="text-xs font-mono text-[#6B7280]">{o.tracking_number}</p>
                            )}
                            {(o.tracking_pickup_date || o.tracking_delivery_date) && (
                              <p className="text-[11px] text-[#9CA3AF]">
                                {fmtDate(o.tracking_pickup_date)} → {fmtDate(o.tracking_delivery_date)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[#D1D5DB]">—</span>
                        )}
                      </td>
                      {/* MRW Tracking */}
                      <td className="px-4 py-3">
                        <MrwTrackingCell
                          orderId={o.id}
                          mrwTrackingNumber={(o as Record<string, unknown>).mrw_tracking_number as string | null}
                          mrwStatus={(o as Record<string, unknown>).mrw_status as string | null}
                          mrwDeliveredAt={(o as Record<string, unknown>).mrw_delivered_at as string | null}
                          mrwLastEvent={(o as Record<string, unknown>).mrw_last_event as string | null}
                          shippingStatus={o.shipping_status}
                          isOwner={isOwner}
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {canEdit && (
                          <Link
                            href={`/dashboard/pedidos/${o.id}/edit`}
                            className="text-xs font-medium text-[#8E0E1A] hover:underline"
                          >
                            Editar
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
