import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { AffiliateDelegateSelect } from "./AffiliateDelegateSelect";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Affiliate {
  id: string;
  referral_code: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  program: string | null;
  status: string;
  standard_link: string | null;
  contact_id: string | null;
  created_at: string;
}

interface Order {
  id: string;
  contact_id: string | null;
  invoice_id: string | null;
  customer_email: string | null;
  order_number: string | null;
  amount: number;
  commission_rate: number | null;
  commission: number;
  status: string;
  created_at: string;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  created_at: string;
}

interface HoldedContact {
  id: string;
  name: string;
  email: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const orderStatusLabel: Record<string, string> = {
  pending:  "Pendiente",
  approved: "Por liquidar",
  settled:  "En pago",
  paid:     "Pagada",
};
const orderStatusVariant: Record<string, "neutral" | "warning" | "success" | "default"> = {
  pending:  "warning",
  approved: "neutral",
  settled:  "default",
  paid:     "success",
};
const paymentStatusLabel:   Record<string, string>  = { generated: "Por pagar", paid: "Pagado" };
const paymentStatusVariant: Record<string, "warning" | "success"> = { generated: "warning", paid: "success" };

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AfiliadoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [supabase, profile] = await Promise.all([createClient(), getProfile()]);
  const isOwner = profile?.role === "OWNER";

  const admin = createAdminClient();

  // Use admin for all bixgrow queries — tables have OWNER-only RLS
  const [{ data: affData }, { data: ordersData }, { data: paymentsData }, { data: delegatesData }] =
    await Promise.all([
      admin.from("bixgrow_affiliates").select("*").eq("id", id).maybeSingle(),
      admin.from("bixgrow_orders").select("id, contact_id, invoice_id, customer_email, order_number, amount, commission_rate, commission, status, created_at").eq("affiliate_id", id).order("created_at", { ascending: false }),
      admin.from("bixgrow_payments").select("id, amount, status, created_at").eq("affiliate_id", id).order("created_at", { ascending: false }),
      isOwner
        ? admin.from("profiles").select("id, full_name, delegate_name").eq("role", "DELEGATE").order("full_name")
        : Promise.resolve({ data: [] }),
    ]);

  if (!affData) notFound();

  const aff       = affData as Affiliate;
  const delegates = (delegatesData ?? []) as { id: string; full_name: string; delegate_name: string | null }[];
  const orders   = (ordersData   ?? []) as Order[];
  const payments = (paymentsData ?? []) as Payment[];

  // Load linked contact if any
  let linkedContact: HoldedContact | null = null;
  if (aff.contact_id) {
    const { data } = await supabase.from("holded_contacts").select("id, name, email").eq("id", aff.contact_id).maybeSingle();
    linkedContact = data as HoldedContact | null;
  }

  // Clients referenced in orders
  const orderContactIds = [...new Set(orders.map(o => o.contact_id).filter(Boolean))] as string[];
  let associatedClients: { id: string; name: string; email: string | null; orderCount: number; totalCommission: number; lastOrder: string }[] = [];
  if (orderContactIds.length > 0) {
    const { data: contactsData } = await admin
      .from("holded_contacts")
      .select("id, name, email")
      .in("id", orderContactIds);
    const contactMap = new Map((contactsData ?? []).map(c => [c.id, c]));
    associatedClients = orderContactIds.map(cid => {
      const c = contactMap.get(cid);
      const myOrders = orders.filter(o => o.contact_id === cid);
      return {
        id:              cid,
        name:            c?.name ?? "Cliente desconocido",
        email:           (c?.email as string | null) ?? null,
        orderCount:      myOrders.length,
        totalCommission: myOrders.reduce((s, o) => s + o.commission, 0),
        lastOrder:       myOrders[0]?.created_at ?? "",
      };
    }).sort((a, b) => b.totalCommission - a.totalCommission);
  }

  const totalCommission = orders.reduce((s, o) => s + o.commission, 0);
  const pendingAmt  = orders.filter((o) => o.status === "pending").reduce((s, o) => s + o.commission, 0);
  const approvedAmt = orders.filter((o) => o.status === "approved").reduce((s, o) => s + o.commission, 0);
  const paidAmt     = orders.filter((o) => o.status === "paid").reduce((s, o) => s + o.commission, 0);
  const name = [aff.first_name, aff.last_name].filter(Boolean).join(" ") || aff.email;

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">

      {/* Back + header */}
      <div>
        <Link href="/dashboard/afiliados" className="inline-flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#8E0E1A] transition-colors mb-4">
          ← Volver a afiliados
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">{name}</h1>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <Badge variant={aff.status === "Approved" ? "success" : "warning"}>{aff.status}</Badge>
              {aff.program && <span className="text-xs text-[#6B7280]">{aff.program}</span>}
              {aff.referral_code && <code className="text-xs font-mono text-[#6B7280]">{aff.referral_code}</code>}
            </div>
          </div>
        </div>
      </div>

      {/* Commission KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm px-4 py-4">
          <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Total generado</p>
          <p className="mt-1.5 text-xl font-bold text-[#0A0A0A] tabular-nums">{fmtCurrency(totalCommission)}</p>
          <p className="mt-0.5 text-xs text-[#9CA3AF]">{orders.length} órdenes</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm px-4 py-4">
          <p className="text-xs font-medium text-[#F59E0B] uppercase tracking-wide">Pendiente</p>
          <p className="mt-1.5 text-xl font-bold text-[#0A0A0A] tabular-nums">{fmtCurrency(pendingAmt)}</p>
          <p className="mt-0.5 text-xs text-[#9CA3AF]">Pendiente de aprobar</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm px-4 py-4">
          <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Por liquidar</p>
          <p className="mt-1.5 text-xl font-bold text-[#0A0A0A] tabular-nums">{fmtCurrency(approvedAmt)}</p>
          <p className="mt-0.5 text-xs text-[#9CA3AF]">Aprobadas sin pago</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm px-4 py-4">
          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Pagado</p>
          <p className="mt-1.5 text-xl font-bold text-[#0A0A0A] tabular-nums">{fmtCurrency(paidAmt)}</p>
          <p className="mt-0.5 text-xs text-[#9CA3AF]">Desembolsado</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Info card */}
        <Card>
          <CardHeader><CardTitle>Datos del afiliado</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-[#F3F4F6]">
              {[
                { label: "Email",         value: aff.email },
                { label: "Programa",      value: aff.program ?? "—" },
                { label: "Código",        value: aff.referral_code ?? "—" },
                { label: "Enlace",        value: aff.standard_link ?? "—" },
                { label: "Alta",          value: fmtDate(aff.created_at) },
              ].map(({ label, value }) => (
                <li key={label} className="flex items-start justify-between gap-4 px-5 py-3">
                  <span className="text-xs text-[#6B7280] shrink-0 pt-0.5">{label}</span>
                  <span className="text-xs font-medium text-[#0A0A0A] text-right break-all">{value}</span>
                </li>
              ))}
            </ul>
            {linkedContact ? (
              <div className="px-5 py-3 border-t border-[#F3F4F6]">
                <p className="text-xs text-[#9CA3AF] mb-1">Cliente vinculado</p>
                <Link href={`/dashboard/clientes/${linkedContact.id}`} className="text-sm font-medium text-[#8E0E1A] hover:underline">
                  {linkedContact.name} →
                </Link>
                {linkedContact.email && <p className="text-xs text-[#6B7280]">{linkedContact.email}</p>}
              </div>
            ) : (
              <div className="px-5 py-3 border-t border-[#F3F4F6]">
                <p className="text-xs text-[#9CA3AF]">Sin cliente vinculado en Holded.</p>
                <p className="text-xs text-[#9CA3AF]">Se vincula automáticamente por email al recibir datos.</p>
              </div>
            )}
          {isOwner && (
            <div className="border-t border-[#F3F4F6]">
              <div className="px-5 pt-3 pb-1">
                <p className="text-xs font-semibold text-[#374151]">Delegado asignado</p>
                <p className="text-[11px] text-[#9CA3AF]">Solo visible para OWNER</p>
              </div>
              <AffiliateDelegateSelect
                affiliateId={aff.id}
                currentDelegateId={(aff as Affiliate & { delegate_id?: string | null }).delegate_id ?? null}
                delegates={delegates}
              />
            </div>
          )}
          </CardContent>
        </Card>

        {/* Orders + Payments — 2/3 */}
        <div className="lg:col-span-2 space-y-6">

          {/* Orders */}
          <Card>
            <CardHeader>
              <CardTitle>Órdenes / Comisiones</CardTitle>
              <span className="text-xs text-[#9CA3AF]">{orders.length} órdenes</span>
            </CardHeader>
            <CardContent className="p-0">
              {orders.length === 0 ? (
                <p className="px-5 py-6 text-xs text-[#9CA3AF] text-center">Sin órdenes registradas.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                        {["Fecha", "Orden / Cliente", "Importe", "Comisión", "Estado", "Factura"].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3F4F6]">
                      {orders.map((o) => (
                        <tr key={o.id} className="hover:bg-[#F9FAFB]">
                          <td className="px-4 py-3 text-xs text-[#6B7280] whitespace-nowrap">{fmtDate(o.created_at)}</td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-[#0A0A0A]">{o.order_number ?? o.id.slice(0, 10) + "…"}</p>
                            {o.customer_email && <p className="text-xs text-[#6B7280]">{o.customer_email}</p>}
                            {o.contact_id && (
                              <Link href={`/dashboard/clientes/${o.contact_id}`} className="text-xs text-[#8E0E1A] hover:underline">Ver cliente →</Link>
                            )}
                          </td>
                          <td className="px-4 py-3 tabular-nums whitespace-nowrap text-[#0A0A0A] font-medium">{fmtCurrency(o.amount)}</td>
                          <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                            <span className="font-semibold text-[#0A0A0A]">{fmtCurrency(o.commission)}</span>
                            {o.commission_rate != null && (
                              <span className="ml-1 text-xs text-[#9CA3AF]">({o.commission_rate}%)</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge variant={orderStatusVariant[o.status] ?? "neutral"}>
                              {orderStatusLabel[o.status] ?? o.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {o.invoice_id ? (
                              <Link href={`/dashboard/facturas/${o.invoice_id}`} className="text-xs font-medium text-[#8E0E1A] hover:underline">
                                Ver factura →
                              </Link>
                            ) : (
                              <span className="text-xs text-[#D1D5DB]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-[#E5E7EB] bg-[#F9FAFB]">
                        <td colSpan={3} className="px-4 py-3 text-xs text-[#6B7280]">Total comisiones</td>
                        <td className="px-4 py-3 text-sm font-bold text-[#0A0A0A] tabular-nums">{fmtCurrency(totalCommission)}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payments */}
          <Card>
            <CardHeader>
              <CardTitle>Pagos al afiliado</CardTitle>
              <span className="text-xs text-[#9CA3AF]">{payments.length} pago{payments.length !== 1 ? "s" : ""}</span>
            </CardHeader>
            <CardContent className="p-0">
              {payments.length === 0 ? (
                <p className="px-5 py-6 text-xs text-[#9CA3AF] text-center">Sin pagos registrados.</p>
              ) : (
                <ul className="divide-y divide-[#F3F4F6]">
                  {payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between px-5 py-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-[#0A0A0A]">{fmtDate(p.created_at)}</p>
                        <p className="text-xs text-[#6B7280] font-mono">{p.id.slice(0, 16)}…</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="tabular-nums font-semibold text-[#0A0A0A]">{fmtCurrency(p.amount)}</span>
                        <Badge variant={paymentStatusVariant[p.status] ?? "neutral"}>
                          {paymentStatusLabel[p.status] ?? p.status}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Clientes asociados */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes asociados</CardTitle>
          <span className="text-xs text-[#9CA3AF]">{associatedClients.length} cliente{associatedClients.length !== 1 ? "s" : ""}</span>
        </CardHeader>
        <CardContent className="p-0">
          {associatedClients.length === 0 ? (
            <p className="px-5 py-6 text-xs text-[#9CA3AF] text-center">Sin clientes asociados a este afiliado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                    {["Cliente", "Email", "Órdenes", "Comisión total", "Última orden", ""].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {associatedClients.map(c => (
                    <tr key={c.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-4 py-3 font-medium text-[#0A0A0A] whitespace-nowrap">{c.name}</td>
                      <td className="px-4 py-3 text-xs text-[#6B7280]">{c.email ?? "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-[#F3F4F6] text-[#374151] text-xs font-semibold px-2.5 py-0.5 min-w-[28px]">
                          {c.orderCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap font-semibold text-[#0A0A0A]">
                        {fmtCurrency(c.totalCommission)}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#6B7280] whitespace-nowrap">{fmtDate(c.lastOrder)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link href={`/dashboard/clientes/${c.id}`} className="text-xs font-medium text-[#6B7280] hover:text-[#8E0E1A] transition-colors">
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
