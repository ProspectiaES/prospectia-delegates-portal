import Link from "next/link";
import { redirect } from "next/navigation";
import { getClientContact, getAssignedDelegate } from "@/lib/clientSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtEuro, pendingAmount } from "@/lib/invoices";

export default async function ClientePage() {
  const contact = await getClientContact();
  if (!contact) redirect("/login");

  const admin = createAdminClient();
  const [delegate, { data: invoicesData }] = await Promise.all([
    getAssignedDelegate(contact.id),
    admin.from("holded_invoices")
      .select("total, status, raw, is_credit_note")
      .eq("contact_id", contact.id)
      .eq("is_credit_note", false),
  ]);

  const invoices = invoicesData ?? [];
  const totalPendiente = invoices.reduce((s, inv) => s + pendingAmount(inv), 0);
  const facturasPendientes = invoices.filter(inv => inv.status === 1).length;
  const facturasVencidas = invoices.filter(inv => inv.status === 2).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Hola, {contact.name}</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Tu área privada — solo tú puedes ver estos datos.</p>
      </div>

      {delegate && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm px-5 py-4">
          <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Tu delegado/a de referencia</p>
          <p className="mt-1 text-sm font-semibold text-[#0A0A0A]">{delegate.name}</p>
          {delegate.email && <p className="text-sm text-[#6B7280]">{delegate.email}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm px-5 py-4">
          <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Total pendiente</p>
          <p className="mt-1 text-2xl font-bold text-[#0A0A0A] tabular-nums">{fmtEuro(totalPendiente)}</p>
          <p className="mt-1 text-xs text-[#6B7280]">importe por pagar</p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm px-5 py-4">
          <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Facturas pendientes</p>
          <p className="mt-1 text-2xl font-bold text-amber-600 tabular-nums">{facturasPendientes}</p>
          <p className="mt-1 text-xs text-[#6B7280]">en plazo</p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm px-5 py-4">
          <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Facturas vencidas</p>
          <p className="mt-1 text-2xl font-bold text-[#8E0E1A] tabular-nums">{facturasVencidas}</p>
          <p className="mt-1 text-xs text-[#6B7280]">fuera de plazo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/cliente/facturas"
          className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm px-5 py-5 hover:border-[#B8860B] transition-colors"
        >
          <p className="text-sm font-semibold text-[#0A0A0A]">Mis facturas</p>
          <p className="mt-1 text-xs text-[#6B7280]">Consulta tu historial de facturas →</p>
        </Link>
        <Link
          href="/cliente/pedidos"
          className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm px-5 py-5 hover:border-[#B8860B] transition-colors"
        >
          <p className="text-sm font-semibold text-[#0A0A0A]">Mis pedidos</p>
          <p className="mt-1 text-xs text-[#6B7280]">Consulta el estado de tus pedidos →</p>
        </Link>
        <Link
          href="/cliente/pedidos/nuevo"
          className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm px-5 py-5 hover:border-[#B8860B] transition-colors"
        >
          <p className="text-sm font-semibold text-[#0A0A0A]">Hacer un pedido</p>
          <p className="mt-1 text-xs text-[#6B7280]">Crea un nuevo pedido →</p>
        </Link>
      </div>
    </div>
  );
}
