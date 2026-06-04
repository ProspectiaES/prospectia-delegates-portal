import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MrwTrackingCell } from "@/components/MrwTrackingCell";
import SyncButton from "./SyncButton";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Holded salesorder status: 1=Pendiente/Aceptado, 2=Facturado, 0=Borrador, -1=Cancelado
// Un pedido és "Finalitzat" quan té una factura cobrada (status=3 en holded_invoices).
// Holded retorna status=1 fins i tot per "Aceptados" — no és fiable com a criteri.

// ─── Order table ──────────────────────────────────────────────────────────────

type Order = {
  id: string;
  doc_number: string | null;
  contact_id: string | null;
  contact_name: string | null;
  date: string | null;
  total: number;
  status: number;
  shipping_status: number | null;
  tracking_company_name: string | null;
  tracking_number: string | null;
  tracking_pickup_date: string | null;
  tracking_delivery_date: string | null;
  mrw_tracking_number?: string | null;
  mrw_status?: string | null;
  mrw_delivered_at?: string | null;
  mrw_last_event?: string | null;
  // JOIN: invoice data
  inv_num?: string | null;
  inv_date_paid?: string | null;
};

function OrderTable({ orders, isOwner, finalizado }: { orders: Order[]; isOwner: boolean; finalizado?: boolean }) {
  if (orders.length === 0) {
    return (
      <p className="text-sm text-[#9CA3AF] py-6 text-center">
        {finalizado ? "No hay pedidos finalizados." : "No hay pedidos en curso."}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
            {["Pedido", "Cliente", "Fecha", "Importe",
              finalizado ? "Factura pagada" : "Estado",
              finalizado ? "" : "Seguimiento",
              finalizado ? "" : "MRW",
              ""].map((h, i) => (
              <th key={i} className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F3F4F6]">
          {orders.map(o => {
            const canEdit = o.status === 0;
            return (
              <tr key={o.id} className="hover:bg-[#F9FAFB] transition-colors">
                {/* Núm. pedido */}
                <td className="px-4 py-3 font-mono font-semibold text-[#0A0A0A] whitespace-nowrap">
                  {o.doc_number ?? <span className="text-[#D1D5DB]">—</span>}
                </td>

                {/* Client */}
                <td className="px-4 py-3 text-[#374151] max-w-[200px] truncate">
                  {o.contact_name ?? "—"}
                </td>

                {/* Data */}
                <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">{fmtDate(o.date)}</td>

                {/* Import */}
                <td className="px-4 py-3 tabular-nums font-semibold text-[#0A0A0A] whitespace-nowrap">
                  {fmtEuro(o.total)}
                </td>

                {/* Col. 5: Factura pagada (finalitzats) o Estat (en curs) */}
                {finalizado ? (
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div>
                      {o.inv_num && (
                        <p className="text-xs font-mono font-semibold text-emerald-700">{o.inv_num}</p>
                      )}
                      {o.inv_date_paid && (
                        <p className="text-[11px] text-[#6B7280]">{fmtDate(o.inv_date_paid)}</p>
                      )}
                    </div>
                  </td>
                ) : (
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge variant="warning">En curso</Badge>
                  </td>
                )}

                {/* Col. 6: Seguiment (solo en curso) */}
                {!finalizado && (
                  <td className="px-4 py-3 min-w-[160px]">
                    {o.tracking_number || o.tracking_company_name ? (
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
                )}

                {/* Col. 7: MRW (solo en curso) */}
                {!finalizado && (
                  <td className="px-4 py-3">
                    <MrwTrackingCell
                      orderId={o.id}
                      mrwTrackingNumber={o.mrw_tracking_number ?? null}
                      mrwStatus={o.mrw_status ?? null}
                      mrwDeliveredAt={o.mrw_delivered_at ?? null}
                      mrwLastEvent={o.mrw_last_event ?? null}
                      shippingStatus={o.shipping_status}
                      isOwner={isOwner}
                    />
                  </td>
                )}

                {/* Accions */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {canEdit && !finalizado && (
                    <Link href={`/dashboard/pedidos/${o.id}/edit`}
                      className="text-xs font-medium text-[#8E0E1A] hover:underline">
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
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PedidosPage() {
  const [supabase, profile] = await Promise.all([createClient(), getProfile()]);
  const isOwner = ["OWNER", "ADMIN"].includes(profile?.role ?? "");

  let contactFilter: string[] | null = null;
  if (profile?.role === "DELEGATE") {
    const admin = createAdminClient();
    const { data: links } = await admin
      .from("contact_delegates")
      .select("contact_id")
      .eq("delegate_id", profile.id);
    contactFilter = (links ?? []).map(r => r.contact_id as string);
    if (contactFilter.length === 0) {
      return (
        <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">
          <h1 className="text-2xl font-bold text-[#0A0A0A]">Pedidos</h1>
          <Card><p className="text-sm text-[#6B7280] py-12 text-center">Aún no tienes pedidos.</p></Card>
        </div>
      );
    }
  }

  // ── Pedidos finalizados: tienen al menos una factura cobrada ──────────────
  // Usamos una subquery: contact_id IN (SELECT contact_id FROM holded_invoices WHERE status=3)
  // Y los cruzamos con los pedidos de ese mismo contacto

  // Fetch all orders (last 200) with their invoice info
  const admin = createAdminClient();

  // Get all orders, ordered by date desc
  let ordersQuery = admin
    .from("holded_salesorders")
    .select("id, doc_number, contact_id, contact_name, date, total, status, shipping_status, tracking_company_name, tracking_number, tracking_pickup_date, tracking_delivery_date, mrw_tracking_number, mrw_status, mrw_delivered_at, mrw_last_event")
    .order("date", { ascending: false })
    .limit(500);

  if (contactFilter) ordersQuery = ordersQuery.in("contact_id", contactFilter);

  const { data: allOrders } = await ordersQuery;
  const orders = (allOrders ?? []) as Order[];

  // Get contact_ids that have at least one paid invoice → these orders are "finalizados"
  const contactIds = [...new Set(orders.map(o => o.contact_id).filter(Boolean) as string[])];
  let paidInvoiceMap: Record<string, { inv_num: string; inv_date_paid: string }> = {};

  if (contactIds.length > 0) {
    const { data: paidInvoices } = await admin
      .from("holded_invoices")
      .select("contact_id, doc_number, date_paid")
      .in("contact_id", contactIds)
      .eq("status", 3)
      .eq("is_credit_note", false)
      .order("date_paid", { ascending: false });

    // Per cada contact, agafem la factura cobrada més recent
    for (const inv of paidInvoices ?? []) {
      const cid = (inv as { contact_id: string; doc_number: string | null; date_paid: string | null }).contact_id;
      if (!paidInvoiceMap[cid]) {
        paidInvoiceMap[cid] = {
          inv_num:      (inv as { doc_number: string | null }).doc_number ?? "—",
          inv_date_paid: (inv as { date_paid: string | null }).date_paid ?? "",
        };
      }
    }
  }

  // Classifiquem: finalitzat = contact té factura cobrada
  const enCurso:    (Order & { inv_num?: string; inv_date_paid?: string })[] = [];
  const finalizados:(Order & { inv_num?: string; inv_date_paid?: string })[] = [];

  for (const o of orders) {
    const paid = o.contact_id ? paidInvoiceMap[o.contact_id] : null;
    if (paid) {
      finalizados.push({ ...o, inv_num: paid.inv_num, inv_date_paid: paid.inv_date_paid });
    } else {
      enCurso.push({ ...o, inv_num: undefined, inv_date_paid: undefined });
    }
  }

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Pedidos</h1>
          <p className="mt-0.5 text-sm text-[#6B7280]">
            <span className="font-semibold text-[#0A0A0A]">{enCurso.length}</span> en curso ·{" "}
            <span className="font-semibold text-emerald-700">{finalizados.length}</span> finalizados
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && <SyncButton />}
          <Link href="/dashboard/pedidos/nuevo"
            className="h-9 px-4 rounded-lg bg-[#8E0E1A] text-sm font-semibold text-white hover:bg-[#6B0A14] transition-colors shadow-sm flex items-center gap-2">
            + Nuevo pedido
          </Link>
        </div>
      </div>

      {/* ── Pedidos en curso ───────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-bold text-[#0A0A0A]">En curso</h2>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            {enCurso.length}
          </span>
        </div>
        <Card>
          <OrderTable orders={enCurso} isOwner={isOwner} />
        </Card>
      </section>

      {/* ── Pedidos finalizados ────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-bold text-[#0A0A0A]">Finalizados</h2>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            {finalizados.length}
          </span>
          <span className="text-[11px] text-[#9CA3AF]">— con factura cobrada</span>
        </div>
        <Card>
          <OrderTable orders={finalizados} isOwner={isOwner} finalizado />
        </Card>
      </section>
    </div>
  );
}
