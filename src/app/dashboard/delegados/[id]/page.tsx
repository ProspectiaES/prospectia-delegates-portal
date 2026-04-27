import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getProfile } from "@/lib/profile";
import { DelegateBillingForm } from "./DelegateBillingForm";
import { InvoiceTabs, DelegateInvoice } from "./InvoiceTabs";
import { ClientAssignmentPanel } from "./ClientAssignmentPanel";
import { AffiliateAssignmentPanel } from "./AffiliateAssignmentPanel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DelegateProfile {
  id: string;
  full_name: string;
  role: string;
  created_at: string;
  email: string | null;
  phone: string | null;
  nif: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  iban: string | null;
}

interface DbContact {
  id: string;
  name: string;
  code: string | null;
  email: string | null;
  city: string | null;
  type: number | null;
  tags: string[];
}

interface DbAffiliate {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  referral_code: string | null;
  program: string | null;
  delegate_id: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const contactTypeLabel: Record<number, string> = {
  0: "Contacto", 1: "Cliente", 2: "Proveedor", 3: "Acreedor", 4: "Deudor",
};
const contactTypeVariant: Record<number, "default" | "success" | "warning" | "neutral"> = {
  0: "neutral", 1: "success", 2: "default", 3: "warning", 4: "warning",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DelegadoDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [profile, admin] = await Promise.all([getProfile(), Promise.resolve(createAdminClient())]);
  const supabase = await createClient();

  // Load delegate profile via admin (billing columns bypass RLS)
  const { data: delegateData } = await admin
    .from("profiles")
    .select("id, full_name, role, created_at, email, phone, nif, address, city, postal_code, iban")
    .eq("id", id)
    .maybeSingle();

  if (!delegateData || delegateData.role !== "DELEGATE") notFound();

  const delegate = delegateData as DelegateProfile;
  const isOwner  = profile?.role === "OWNER";

  // Load contact IDs assigned to this delegate
  const { data: cdRows } = await supabase
    .from("contact_delegates")
    .select("contact_id")
    .eq("delegate_id", id);

  const contactIds = (cdRows ?? []).map((r) => r.contact_id as string).filter(Boolean);

  // Parallel: assigned clients, invoices, all affiliates
  const [clientsRes, invoicesRes, allAffiliatesRes] = await Promise.all([
    contactIds.length > 0
      ? supabase
          .from("holded_contacts")
          .select("id, name, code, email, city, type, tags")
          .in("id", contactIds)
          .order("name")
      : Promise.resolve({ data: [] as DbContact[] }),
    contactIds.length > 0
      ? supabase
          .from("holded_invoices")
          .select("id, doc_number, contact_id, contact_name, date, due_date, total, status")
          .in("contact_id", contactIds)
          .order("date", { ascending: false })
      : Promise.resolve({ data: [] as DelegateInvoice[] }),
    supabase
      .from("bixgrow_affiliates")
      .select("id, email, first_name, last_name, status, referral_code, program, delegate_id")
      .order("email"),
  ]);

  const clients      = (clientsRes.data      ?? []) as DbContact[];
  const invoices     = (invoicesRes.data     ?? []) as DelegateInvoice[];
  const allAffiliates = (allAffiliatesRes.data ?? []) as DbAffiliate[];

  const assignedAffiliateIds = allAffiliates
    .filter((a) => a.delegate_id === id)
    .map((a) => a.id);

  // Current month period for "Cobradas este mes" tab
  const now         = new Date();
  const periodStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString();
  const periodEnd   = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)).toISOString();

  // Invoice KPIs
  const totalBilled = invoices.reduce((s, inv) => s + inv.total, 0);
  const cobradas    = invoices.filter((inv) => inv.status === 3);
  const pendientes  = invoices.filter((inv) => inv.status === 1);
  const vencidas    = invoices.filter((inv) => inv.status === 2);
  const periodo     = cobradas.filter((inv) => !!inv.date && inv.date >= periodStart && inv.date <= periodEnd);

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">

      {/* Back + header */}
      <div>
        <Link
          href="/dashboard/delegados"
          className="inline-flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#8E0E1A] transition-colors mb-4"
        >
          ← Volver a delegados
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">{delegate.full_name}</h1>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <Badge variant="default">Delegado</Badge>
              {delegate.city && <span className="text-xs text-[#6B7280]">{delegate.city}</span>}
            </div>
          </div>
          <p className="text-xs text-[#9CA3AF] text-right shrink-0 ml-4">
            Alta: {fmtDate(delegate.created_at)}
          </p>
        </div>
      </div>

      {/* Invoice KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm px-4 py-4">
          <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Total facturado</p>
          <p className="mt-1.5 text-xl font-bold text-[#0A0A0A] tabular-nums">{fmtCurrency(totalBilled)}</p>
          <p className="mt-0.5 text-xs text-[#9CA3AF]">{invoices.length} facturas</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm px-4 py-4">
          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Cobradas este mes</p>
          <p className="mt-1.5 text-xl font-bold text-[#0A0A0A] tabular-nums">
            {fmtCurrency(periodo.reduce((s, inv) => s + inv.total, 0))}
          </p>
          <p className="mt-0.5 text-xs text-[#9CA3AF]">{periodo.length} facturas</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm px-4 py-4">
          <p className="text-xs font-medium text-[#F59E0B] uppercase tracking-wide">Pendientes</p>
          <p className="mt-1.5 text-xl font-bold text-[#0A0A0A] tabular-nums">
            {fmtCurrency(pendientes.reduce((s, inv) => s + inv.total, 0))}
          </p>
          <p className="mt-0.5 text-xs text-[#9CA3AF]">{pendientes.length} facturas</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm px-4 py-4">
          <p className="text-xs font-medium text-[#8E0E1A] uppercase tracking-wide">Vencidas</p>
          <p className="mt-1.5 text-xl font-bold text-[#0A0A0A] tabular-nums">
            {fmtCurrency(vencidas.reduce((s, inv) => s + inv.total, 0))}
          </p>
          <p className="mt-0.5 text-xs text-[#9CA3AF]">{vencidas.length} facturas</p>
        </div>
      </div>

      {/* Main grid: billing (1/3) + assignment (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Contact + billing data */}
        <Card>
          <CardHeader>
            <CardTitle>Datos del delegado</CardTitle>
            {isOwner && <span className="text-xs text-[#9CA3AF]">Solo visible para el owner</span>}
          </CardHeader>
          <CardContent>
            {isOwner ? (
              <DelegateBillingForm delegate={delegate} />
            ) : (
              <ul className="divide-y divide-[#F3F4F6] -mx-5">
                {[
                  { label: "Email",     value: delegate.email },
                  { label: "Teléfono", value: delegate.phone },
                  { label: "NIF",      value: delegate.nif },
                  { label: "Ciudad",   value: delegate.city },
                  { label: "Dirección", value: delegate.address },
                  { label: "C.P.",     value: delegate.postal_code },
                  { label: "IBAN",     value: delegate.iban },
                ].map(({ label, value }) => (
                  <li key={label} className="flex items-center justify-between px-5 py-3">
                    <span className="text-xs text-[#6B7280] shrink-0">{label}</span>
                    <span className="text-xs font-medium text-[#0A0A0A] text-right break-all">
                      {value || <span className="text-[#D1D5DB]">—</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Right column: clients + affiliates */}
        <div className="lg:col-span-2 space-y-6">

          {/* Clients */}
          <Card>
            <CardHeader>
              <CardTitle>Clientes asociados</CardTitle>
              <span className="text-xs text-[#9CA3AF]">{clients.length} cliente{clients.length !== 1 ? "s" : ""}</span>
            </CardHeader>
            <CardContent className="p-0">
              {isOwner ? (
                <ClientAssignmentPanel
                  delegateId={id}
                  initialAssigned={clients.map((c) => ({
                    id: c.id,
                    name: c.name,
                    code: c.code,
                    email: c.email,
                    city: c.city,
                  }))}
                />
              ) : clients.length === 0 ? (
                <p className="px-5 py-6 text-xs text-[#9CA3AF] text-center">Sin clientes asignados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                        {["Nombre", "Código", "Email", "Localidad", "Tipo", ""].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3F4F6]">
                      {clients.map((c) => (
                        <tr key={c.id} className="hover:bg-[#F9FAFB] transition-colors">
                          <td className="px-4 py-3 font-medium text-[#0A0A0A] whitespace-nowrap max-w-[160px] truncate">
                            <Link href={`/dashboard/clientes/${c.id}`} className="hover:text-[#8E0E1A] transition-colors">
                              {c.name || <span className="text-[#9CA3AF]">—</span>}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-[#6B7280] whitespace-nowrap">
                            {c.code || <span className="text-[#D1D5DB]">—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-[#6B7280] whitespace-nowrap max-w-[160px] truncate">
                            {c.email || <span className="text-[#D1D5DB]">—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-[#6B7280] whitespace-nowrap">
                            {c.city || <span className="text-[#D1D5DB]">—</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {c.type != null ? (
                              <Badge variant={contactTypeVariant[c.type] ?? "neutral"}>
                                {contactTypeLabel[c.type] ?? `Tipo ${c.type}`}
                              </Badge>
                            ) : (
                              <span className="text-[#D1D5DB] text-xs">—</span>
                            )}
                          </td>
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

          {/* Affiliates */}
          <Card>
            <CardHeader>
              <CardTitle>Afiliados asociados</CardTitle>
              <span className="text-xs text-[#9CA3AF]">{assignedAffiliateIds.length} afiliado{assignedAffiliateIds.length !== 1 ? "s" : ""}</span>
            </CardHeader>
            <CardContent className="p-0">
              {isOwner ? (
                <AffiliateAssignmentPanel
                  delegateId={id}
                  allAffiliates={allAffiliates.map((a) => ({
                    id: a.id,
                    email: a.email,
                    first_name: a.first_name,
                    last_name: a.last_name,
                    status: a.status,
                    referral_code: a.referral_code,
                  }))}
                  assignedIds={assignedAffiliateIds}
                />
              ) : assignedAffiliateIds.length === 0 ? (
                <p className="px-5 py-6 text-xs text-[#9CA3AF] text-center">Sin afiliados asignados.</p>
              ) : (
                <ul className="divide-y divide-[#F3F4F6]">
                  {allAffiliates.filter((a) => assignedAffiliateIds.includes(a.id)).map((a) => {
                    const name = [a.first_name, a.last_name].filter(Boolean).join(" ") || a.email;
                    return (
                      <li key={a.id} className="flex items-center justify-between px-5 py-3 gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#0A0A0A] truncate">{name}</p>
                          <p className="text-xs text-[#6B7280]">{a.email}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant={a.status === "Approved" ? "success" : "warning"}>{a.status}</Badge>
                          <Link href={`/dashboard/afiliados/${a.id}`} className="text-xs font-medium text-[#6B7280] hover:text-[#8E0E1A] transition-colors">
                            Ver →
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invoice list with tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Facturas</CardTitle>
          <span className="text-xs text-[#9CA3AF]">{invoices.length} factura{invoices.length !== 1 ? "s" : ""} en total</span>
        </CardHeader>
        <CardContent className="p-0">
          <InvoiceTabs invoices={invoices} periodStart={periodStart} periodEnd={periodEnd} />
        </CardContent>
      </Card>

    </div>
  );
}
