import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { PrintButton } from "./PrintButton";
import { SyncButton } from "./SyncButton";

const fmtDateTime = (s: string | null) =>
  s ? new Date(s).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const fmtNow = () =>
  new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });

function urgencyBadge(days: number | null, type: "overdue" | "pending") {
  if (type === "overdue") {
    if (days === null) return { cls: "bg-red-100 text-red-700", label: "—" };
    if (days > 60)  return { cls: "bg-[#8E0E1A] text-white",   label: `+${days}d` };
    if (days > 30)  return { cls: "bg-red-200 text-red-900",   label: `+${days}d` };
    return           { cls: "bg-red-100 text-[#8E0E1A]",       label: `+${days}d` };
  }
  if (days === null) return { cls: "bg-[#F3F4F6] text-[#6B7280]", label: "—" };
  if (days <= 0)  return { cls: "bg-[#8E0E1A] text-white",    label: "Hoy" };
  if (days <= 7)  return { cls: "bg-red-100 text-[#8E0E1A]",  label: `${days}d` };
  if (days <= 30) return { cls: "bg-amber-100 text-amber-700", label: `${days}d` };
  return           { cls: "bg-green-100 text-green-700",       label: `${days}d` };
}

function riskLevel(totalVencido: number, totalPendiente: number, countVencidas: number) {
  if (totalVencido > 5000 || countVencidas > 5)
    return { label: "ALTO",  cls: "bg-red-100 text-[#8E0E1A]", bar: "#8E0E1A" };
  if (totalVencido > 0 || totalPendiente > 10000)
    return { label: "MEDIO", cls: "bg-amber-100 text-amber-700", bar: "#F59E0B" };
  return { label: "BAJO",   cls: "bg-green-100 text-green-700",  bar: "#10B981" };
}

export default async function RiesgoInformePage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const admin = createAdminClient();

  const [delegateRes, cdRes, lastSyncRes] = await Promise.all([
    admin.from("profiles")
      .select("id, full_name, delegate_name, email")
      .eq("id", id)
      .maybeSingle(),
    admin.from("contact_delegates").select("contact_id").eq("delegate_id", id),
    admin.from("holded_sync_log")
      .select("finished_at")
      .eq("status", "completed")
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const delegate = delegateRes.data;
  if (!delegate) notFound();

  // OWNER sees anyone's report; each actor sees only their own
  if (profile.role !== "OWNER" && profile.id !== id) redirect("/dashboard");

  const contactIds = (cdRes.data ?? []).map(r => r.contact_id);
  const lastSyncAt = (lastSyncRes.data as { finished_at: string | null } | null)?.finished_at ?? null;

  const invoicesRes = contactIds.length > 0
    ? await admin.from("holded_invoices")
        .select("id, doc_number, contact_id, contact_name, date, due_date, total, status")
        .in("contact_id", contactIds)
        .eq("is_credit_note", false)
        .in("status", [1, 2])
        .order("due_date", { ascending: true })
    : { data: [] };

  const invoices = (invoicesRes.data ?? []) as {
    id: string; doc_number: string | null; contact_id: string | null;
    contact_name: string | null; date: string | null; due_date: string | null;
    total: number; status: number;
  }[];

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const vencidas = invoices
    .filter(i => i.status === 2)
    .map(i => ({
      ...i,
      daysOverdue: i.due_date
        ? Math.floor((now.getTime() - new Date(i.due_date).getTime()) / 86_400_000)
        : null,
    }))
    .sort((a, b) => (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0));

  const pendientes = invoices
    .filter(i => i.status === 1)
    .map(i => ({
      ...i,
      daysUntilDue: i.due_date
        ? Math.floor((new Date(i.due_date).getTime() - now.getTime()) / 86_400_000)
        : null,
    }))
    .sort((a, b) => {
      if (a.daysUntilDue === null) return 1;
      if (b.daysUntilDue === null) return -1;
      return a.daysUntilDue - b.daysUntilDue;
    });

  const totalVencido   = vencidas.reduce((s, i) => s + i.total, 0);
  const totalPendiente = pendientes.reduce((s, i) => s + i.total, 0);
  const risk = riskLevel(totalVencido, totalPendiente, vencidas.length);
  const delegateName = delegate.delegate_name ?? delegate.full_name;

  return (
    <>
      <style>{`
        @media print {
          body { font-size: 11px; }
          .print\\:hidden { display: none !important; }
          @page { margin: 1.5cm; size: A4; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Breadcrumb + actions */}
        <div className="flex items-start justify-between gap-4 print:hidden">
          <Link href={`/dashboard/delegados/${id}`} className="text-xs text-[#9CA3AF] hover:text-[#8E0E1A] transition-colors">
            ← {delegateName}
          </Link>
          <div className="flex items-center gap-2">
            <SyncButton />
            <PrintButton />
          </div>
        </div>

        {/* Report header */}
        <div className="border-b-2 border-[#0A0A0A] pb-4">
          <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest mb-1">
            Informe de riesgo · {fmtNow()}
            {lastSyncAt && (
              <span className="ml-3 normal-case font-normal text-[#9CA3AF]">
                · Última sync Holded: {fmtDateTime(lastSyncAt)}
              </span>
            )}
          </p>
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">{delegateName}</h1>
          {delegate.email && <p className="text-sm text-[#6B7280] mt-0.5">{delegate.email}</p>}
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border-2 border-[#E5E7EB] px-4 py-3">
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Riesgo global</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-sm font-bold ${risk.cls}`}>{risk.label}</span>
          </div>
          <div className="rounded-xl border-2 border-red-200 px-4 py-3">
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Total vencido</p>
            <p className="mt-1 text-lg font-bold text-[#8E0E1A] tabular-nums">{fmtEuro(totalVencido)}</p>
            <p className="text-[10px] text-[#9CA3AF]">{vencidas.length} factura{vencidas.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="rounded-xl border-2 border-amber-200 px-4 py-3">
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Total pendiente</p>
            <p className="mt-1 text-lg font-bold text-amber-700 tabular-nums">{fmtEuro(totalPendiente)}</p>
            <p className="text-[10px] text-[#9CA3AF]">{pendientes.length} factura{pendientes.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="rounded-xl border-2 border-[#E5E7EB] px-4 py-3">
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Exposición total</p>
            <p className="mt-1 text-lg font-bold text-[#0A0A0A] tabular-nums">{fmtEuro(totalVencido + totalPendiente)}</p>
            <p className="text-[10px] text-[#9CA3AF]">{vencidas.length + pendientes.length} facturas</p>
          </div>
        </div>

        {/* Vencidas */}
        {vencidas.length > 0 && (
          <section className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-red-50 border-b border-red-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#8E0E1A] uppercase tracking-wider">Facturas vencidas</p>
                <p className="text-[10px] text-red-600 mt-0.5">Ordenadas de mayor a menor antigüedad</p>
              </div>
              <p className="text-sm font-bold text-[#8E0E1A] tabular-nums">{fmtEuro(totalVencido)}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    {["Factura", "Cliente", "F. emisión", "F. vencimiento", "Importe", "Días vencida"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {vencidas.map(inv => {
                    const badge = urgencyBadge(inv.daysOverdue, "overdue");
                    return (
                      <tr key={inv.id} className="hover:bg-red-50/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0A0A0A] whitespace-nowrap">
                          <Link href={`/dashboard/facturas/${inv.id}`} className="hover:text-[#8E0E1A] print:no-underline print:text-[#0A0A0A]">
                            {inv.doc_number ?? inv.id.slice(0, 8)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-[#374151] text-xs">
                          {inv.contact_id
                            ? <Link href={`/dashboard/clientes/${inv.contact_id}`} className="hover:text-[#8E0E1A] print:no-underline print:text-[#374151]">{inv.contact_name ?? "—"}</Link>
                            : (inv.contact_name ?? "—")}
                        </td>
                        <td className="px-4 py-3 text-[#6B7280] text-xs whitespace-nowrap tabular-nums">{fmtDate(inv.date)}</td>
                        <td className="px-4 py-3 text-[#6B7280] text-xs whitespace-nowrap tabular-nums">{fmtDate(inv.due_date)}</td>
                        <td className="px-4 py-3 font-semibold text-[#0A0A0A] text-xs whitespace-nowrap tabular-nums">{fmtEuro(inv.total)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-red-50 border-t border-red-200">
                    <td colSpan={4} className="px-4 py-2 text-xs font-semibold text-[#8E0E1A]">{vencidas.length} factura{vencidas.length !== 1 ? "s" : ""} vencida{vencidas.length !== 1 ? "s" : ""}</td>
                    <td className="px-4 py-2 font-bold text-[#8E0E1A] text-xs tabular-nums">{fmtEuro(totalVencido)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        )}

        {/* Pendientes */}
        {pendientes.length > 0 && (
          <section className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Facturas pendientes</p>
                <p className="text-[10px] text-amber-600 mt-0.5">Ordenadas por proximidad de vencimiento</p>
              </div>
              <p className="text-sm font-bold text-amber-700 tabular-nums">{fmtEuro(totalPendiente)}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    {["Factura", "Cliente", "F. emisión", "F. vencimiento", "Importe", "Días p/ vencer"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {pendientes.map(inv => {
                    const badge = urgencyBadge(inv.daysUntilDue, "pending");
                    return (
                      <tr key={inv.id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0A0A0A] whitespace-nowrap">
                          <Link href={`/dashboard/facturas/${inv.id}`} className="hover:text-[#8E0E1A] print:no-underline print:text-[#0A0A0A]">
                            {inv.doc_number ?? inv.id.slice(0, 8)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-[#374151] text-xs">
                          {inv.contact_id
                            ? <Link href={`/dashboard/clientes/${inv.contact_id}`} className="hover:text-[#8E0E1A] print:no-underline print:text-[#374151]">{inv.contact_name ?? "—"}</Link>
                            : (inv.contact_name ?? "—")}
                        </td>
                        <td className="px-4 py-3 text-[#6B7280] text-xs whitespace-nowrap tabular-nums">{fmtDate(inv.date)}</td>
                        <td className="px-4 py-3 text-[#6B7280] text-xs whitespace-nowrap tabular-nums">{fmtDate(inv.due_date)}</td>
                        <td className="px-4 py-3 font-semibold text-[#0A0A0A] text-xs whitespace-nowrap tabular-nums">{fmtEuro(inv.total)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-amber-50 border-t border-amber-200">
                    <td colSpan={4} className="px-4 py-2 text-xs font-semibold text-amber-700">{pendientes.length} factura{pendientes.length !== 1 ? "s" : ""} pendiente{pendientes.length !== 1 ? "s" : ""}</td>
                    <td className="px-4 py-2 font-bold text-amber-700 text-xs tabular-nums">{fmtEuro(totalPendiente)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        )}

        {vencidas.length === 0 && pendientes.length === 0 && (
          <div className="rounded-xl border border-[#E5E7EB] bg-white px-6 py-12 text-center">
            <p className="text-sm text-[#9CA3AF]">Sin facturas de riesgo para este delegado.</p>
          </div>
        )}

        {/* Print footer */}
        <div className="hidden print:block border-t border-[#E5E7EB] pt-4 text-[10px] text-[#9CA3AF]">
          Informe generado el {fmtNow()} · Prospectia Delegates Portal · dashboard.prospectia.es
        </div>

      </div>
    </>
  );
}
