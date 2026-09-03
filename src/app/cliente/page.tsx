import Link from "next/link";
import { redirect } from "next/navigation";
import { getClientContact } from "@/lib/clientSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtEuro, pendingAmount } from "@/lib/invoices";

export default async function ClientePage() {
  const contact = await getClientContact();
  if (!contact) redirect("/login");

  const admin = createAdminClient();
  const [{ data: invoicesData }, { data: ordersData }] = await Promise.all([
    admin.from("holded_invoices")
      .select("total, status, raw, is_credit_note")
      .eq("contact_id", contact.id),
    admin.from("holded_salesorders")
      .select("id, status")
      .eq("contact_id", contact.id)
      .lt("status", 3),
  ]);

  const invoices = invoicesData ?? [];
  const outstanding = invoices
    .filter(inv => !inv.is_credit_note)
    .reduce((s, inv) => s + pendingAmount(inv), 0);
  const outstandingCount = invoices.filter(inv => !inv.is_credit_note && pendingAmount(inv) > 0.02).length;
  const openOrdersCount = (ordersData ?? []).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Hola, {contact.name}</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Tu área privada — solo tú puedes ver estos datos.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/cliente/facturas"
          className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm px-5 py-5 hover:border-[#B8860B] transition-colors"
        >
          <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Pendiente de pago</p>
          <p className="mt-1 text-2xl font-bold text-[#0A0A0A] tabular-nums">{fmtEuro(outstanding)}</p>
          <p className="mt-1 text-xs text-[#6B7280]">{outstandingCount} factura{outstandingCount !== 1 ? "s" : ""} · Ver todas →</p>
        </Link>

        <Link
          href="/cliente/pedidos"
          className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm px-5 py-5 hover:border-[#B8860B] transition-colors"
        >
          <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Pedidos en curso</p>
          <p className="mt-1 text-2xl font-bold text-[#0A0A0A] tabular-nums">{openOrdersCount}</p>
          <p className="mt-1 text-xs text-[#6B7280]">Ver estado →</p>
        </Link>
      </div>

      <Link
        href="/cliente/pedidos/nuevo"
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#B8860B] text-sm font-semibold text-white hover:bg-[#96700A] transition-colors"
      >
        + Nuevo pedido
      </Link>
    </div>
  );
}
