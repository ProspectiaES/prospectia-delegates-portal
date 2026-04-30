import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { orderStatus } from "@/lib/holded/api";
import { ContactEditForm } from "./ContactEditForm";
import { DelegateAssignment } from "./DelegateAssignment";
import { AffiliateSelect } from "./AffiliateSelect";
import { RecommenderSelect } from "./RecommenderSelect";
import { PaymentForm } from "./PaymentForm";
import { ProfileAssignSelect } from "./ProfileAssignSelect";
import { saveContactKOL, saveContactCoordinator, saveContactCommission6 } from "@/app/actions/contacts";
import { getProfile } from "@/lib/profile";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbContact {
  id: string;
  name: string;
  code: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  type: number | null;
  tags: string[];
  address: string | null;
  city: string | null;
  postal_code: string | null;
  province: string | null;
  country: string | null;
  country_code: string | null;
  affiliate_id: string | null;
  recommender_id: string | null;
  payment_method: string | null;
  iban: string | null;
  bic: string | null;
  kol_id: string | null;
  coordinator_id: string | null;
  commission_6_id: string | null;
  first_synced_at: string;
  last_synced_at: string;
  raw: Record<string, unknown>;
}

interface DbInvoice {
  id: string;
  doc_number: string | null;
  date: string | null;
  due_date: string | null;
  total: number;
  status: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const typeLabel: Record<number, string> = {
  0: "Contacto", 1: "Cliente", 2: "Proveedor", 3: "Acreedor", 4: "Deudor",
};
const typeVariant: Record<number, "default" | "success" | "warning" | "neutral"> = {
  0: "neutral", 1: "success", 2: "default", 3: "warning", 4: "warning",
};
const statusLabel: Record<number, string> = { 0: "Borrador", 1: "Pendiente", 2: "Vencida", 3: "Cobrada" };
const statusVariant: Record<number, "neutral" | "warning" | "danger" | "success"> = {
  0: "neutral", 1: "warning", 2: "danger", 3: "success",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClienteDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [profile, { data: contactData }, { data: invoicesData }, { data: ordersData }] = await Promise.all([
    getProfile(),
    supabase
      .from("holded_contacts")
      .select("id, name, code, email, phone, mobile, type, tags, address, city, postal_code, province, country, country_code, affiliate_id, recommender_id, payment_method, iban, bic, kol_id, coordinator_id, commission_6_id, first_synced_at, last_synced_at, raw")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("holded_invoices")
      .select("id, doc_number, date, due_date, total, status")
      .eq("contact_id", id)
      .order("date", { ascending: false })
      .limit(10),
    // Open salesorders (not fully invoiced)
    supabase
      .from("holded_salesorders")
      .select("id, doc_number, date, total, status")
      .eq("contact_id", id)
      .lt("status", 3)
      .order("date", { ascending: false }),
  ]);

  if (!contactData) notFound();

  const isOwner    = profile?.role === "OWNER";
  const isDelegate = profile?.role === "DELEGATE";

  // Delegate: verify contact belongs to their universe
  if (isDelegate && profile) {
    const admin = createAdminClient();
    const { data: link } = await admin
      .from("contact_delegates")
      .select("contact_id")
      .eq("delegate_id", profile.id)
      .eq("contact_id", id)
      .maybeSingle();
    if (!link) notFound();
  }

  // Owner-only: load delegates + current assignments + all affiliates + KOL/Coord/Com6 profiles
  // Delegate: load their assigned affiliates for affiliate+recommender widgets
  let allDelegates: { id: string; full_name: string }[] = [];
  let assignedIds: string[] = [];
  let allAffiliates: { id: string; email: string; first_name: string | null; last_name: string | null; referral_code: string | null }[] = [];
  let kolProfiles:   { id: string; display_name: string }[] = [];
  let coordProfiles: { id: string; display_name: string }[] = [];
  let com6Profiles:  { id: string; display_name: string }[] = [];

  if (isOwner) {
    const admin = createAdminClient();
    const [delegatesRes, assignmentsRes, affiliatesRes, kolRes, coordRes, com6Res] = await Promise.all([
      admin.from("profiles").select("id, full_name").eq("role", "DELEGATE").order("full_name"),
      admin.from("contact_delegates").select("delegate_id").eq("contact_id", id),
      admin.from("bixgrow_affiliates").select("id, email, first_name, last_name, referral_code").order("email"),
      admin.from("profiles").select("id, full_name, delegate_name").eq("role", "KOL").order("full_name"),
      admin.from("profiles").select("id, full_name, delegate_name").eq("role", "COORDINATOR").order("full_name"),
      admin.from("profiles").select("id, full_name, delegate_name").eq("role", "COM6").order("full_name"),
    ]);
    allDelegates  = (delegatesRes.data  ?? []) as typeof allDelegates;
    assignedIds   = (assignmentsRes.data ?? []).map((r) => r.delegate_id);
    allAffiliates = (affiliatesRes.data  ?? []) as typeof allAffiliates;
    kolProfiles   = (kolRes.data   ?? []).map((p: { id: string; full_name: string; delegate_name: string | null }) => ({ id: p.id, display_name: p.delegate_name ?? p.full_name }));
    coordProfiles = (coordRes.data ?? []).map((p: { id: string; full_name: string; delegate_name: string | null }) => ({ id: p.id, display_name: p.delegate_name ?? p.full_name }));
    com6Profiles  = (com6Res.data  ?? []).map((p: { id: string; full_name: string; delegate_name: string | null }) => ({ id: p.id, display_name: p.delegate_name ?? p.full_name }));
  } else if (isDelegate && profile) {
    const admin = createAdminClient();
    const { data: affiliatesRes } = await admin
      .from("bixgrow_affiliates")
      .select("id, email, first_name, last_name, referral_code")
      .eq("delegate_id", profile.id)
      .order("email");
    allAffiliates = (affiliatesRes ?? []) as typeof allAffiliates;
  }

  const contact    = contactData as DbContact;
  const invoices   = (invoicesData ?? []) as DbInvoice[];
  const openOrders = (ordersData ?? []) as { id: string; doc_number: string | null; date: string | null; total: number; status: number }[];

  // Prospecto de origen (CRM → cliente)
  const admin2 = createAdminClient();
  const { data: prospectoData } = await admin2
    .from("prospectos")
    .select("id, name, delegate_id, converted_at, profiles!prospectos_delegate_id_fkey(full_name)")
    .eq("holded_contact_id", id)
    .maybeSingle();
  const prospecto = prospectoData as { id: string; name: string; delegate_id: string; converted_at: string | null; profiles: { full_name?: string } | null } | null;

  // Load current recommender name (for display)
  let currentRecommender: { id: string; name: string; code: string | null; email: string | null; city: string | null } | null = null;
  if (contact.recommender_id) {
    const { data: recData } = await supabase
      .from("holded_contacts")
      .select("id, name, code, email, city")
      .eq("id", contact.recommender_id)
      .maybeSingle();
    currentRecommender = recData ?? null;
  }
  const totalBilled = invoices.reduce((s, inv) => s + inv.total, 0);
  const totalPaid   = invoices.filter((inv) => inv.status === 3).reduce((s, inv) => s + inv.total, 0);

  const location = [contact.city, contact.province, contact.country].filter(Boolean).join(", ");

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">

      {/* Back + header */}
      <div>
        <Link
          href="/dashboard/clientes"
          className="inline-flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#8E0E1A] transition-colors mb-4"
        >
          ← Volver a clientes
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">{contact.name}</h1>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              {contact.type != null && (
                <Badge variant={typeVariant[contact.type] ?? "neutral"}>
                  {typeLabel[contact.type] ?? `Tipo ${contact.type}`}
                </Badge>
              )}
              {contact.code && (
                <span className="text-xs text-[#6B7280] font-mono">{contact.code}</span>
              )}
              {location && (
                <span className="text-xs text-[#6B7280]">{location}</span>
              )}
            </div>
          </div>
          {isOwner && (
            <p className="text-xs text-[#9CA3AF] text-right shrink-0 ml-4">
              Sync: {fmtDate(contact.last_synced_at)}
            </p>
          )}
        </div>
      </div>

      {/* Prospecto de origen (CRM link) */}
      {prospecto && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#FEF2F2] border border-[#8E0E1A]/10">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#8E0E1A" strokeWidth="1.5">
            <path d="M8 2c-1.5 0-4 .8-4 3 0 1.5.8 2.5 2 3L4.5 14h7L10 8c1.2-.5 2-1.5 2-3 0-2.2-2.5-3-4-3z" strokeLinejoin="round"/>
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-[#8E0E1A] uppercase tracking-wider">Prospecto de origen (CRM)</p>
            <p className="text-sm font-medium text-[#0A0A0A] truncate">{prospecto.name}</p>
            {prospecto.profiles?.full_name && (
              <p className="text-[11px] text-[#6B7280]">Delegado: {prospecto.profiles.full_name}{prospecto.converted_at && ` · Convertido ${new Date(prospecto.converted_at).toLocaleDateString("es-ES")}`}</p>
            )}
          </div>
          <Link
            href={`/dashboard/prospectos/${prospecto.id}`}
            className="shrink-0 text-xs font-semibold text-[#8E0E1A] hover:underline"
          >
            Ver prospecto →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Edit form — 2/3 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Datos del contacto</CardTitle>
            {isOwner && <span className="text-xs text-[#9CA3AF]">Editable · se guarda en Holded</span>}
          </CardHeader>
          <CardContent>
            <ContactEditForm contact={{
              id:          contact.id,
              name:        contact.name,
              code:        contact.code,
              email:       contact.email,
              phone:       contact.phone,
              mobile:      contact.mobile,
              type:        contact.type,
              tags:        contact.tags ?? [],
              address:     contact.address,
              city:        contact.city,
              postal_code: contact.postal_code,
              province:    contact.province,
              country:     contact.country,
            }} />
          </CardContent>
        </Card>

        {/* Stats + invoices — 1/3 */}
        <div className="space-y-6">

          {/* Stats */}
          <Card>
            <CardHeader><CardTitle>Resumen económico</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-[#F3F4F6]">
                {[
                  { label: "Facturas totales", value: String(invoices.length) },
                  { label: "Facturado",         value: fmtCurrency(totalBilled) },
                  { label: "Cobrado",           value: fmtCurrency(totalPaid) },
                  { label: "Pendiente",         value: fmtCurrency(totalBilled - totalPaid) },
                ].map(({ label, value }) => (
                  <li key={label} className="flex items-center justify-between px-5 py-3">
                    <span className="text-xs text-[#6B7280]">{label}</span>
                    <span className="text-xs font-semibold text-[#0A0A0A] tabular-nums">{value}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Delegate assignment — owner only */}
          {isOwner && (
            <Card>
              <CardHeader>
                <CardTitle>Delegados asignados</CardTitle>
                <span className="text-xs text-[#9CA3AF]">Solo visible para ti</span>
              </CardHeader>
              <CardContent className="p-0">
                <DelegateAssignment
                  contactId={contact.id}
                  delegates={allDelegates}
                  assignedIds={assignedIds}
                />
              </CardContent>
            </Card>
          )}

          {/* Affiliate assignment — owner + delegate */}
          {(isOwner || isDelegate) && (
            <Card>
              <CardHeader>
                <CardTitle>Afiliado asignado</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <AffiliateSelect
                  contactId={contact.id}
                  affiliates={allAffiliates}
                  currentAffiliateId={contact.affiliate_id}
                />
              </CardContent>
            </Card>
          )}

          {/* Recommender — owner + delegate */}
          {(isOwner || isDelegate) && (
            <Card>
              <CardHeader>
                <CardTitle>Recomendador</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <RecommenderSelect
                  contactId={contact.id}
                  currentRecommender={currentRecommender}
                />
              </CardContent>
            </Card>
          )}

          {/* KOL assignment — owner only */}
          {isOwner && (
            <Card>
              <CardHeader>
                <CardTitle>KOL asignado</CardTitle>
                <span className="text-xs text-[#9CA3AF]">Key Opinion Leader</span>
              </CardHeader>
              <CardContent className="p-0">
                <ProfileAssignSelect
                  contactId={contact.id}
                  profiles={kolProfiles}
                  currentId={contact.kol_id}
                  action={saveContactKOL}
                  placeholder="Sin KOL asignado"
                />
              </CardContent>
            </Card>
          )}

          {/* Coordinator assignment — owner only */}
          {isOwner && (
            <Card>
              <CardHeader>
                <CardTitle>Coordinador asignado</CardTitle>
                <span className="text-xs text-[#9CA3AF]">Coordinador de ventas</span>
              </CardHeader>
              <CardContent className="p-0">
                <ProfileAssignSelect
                  contactId={contact.id}
                  profiles={coordProfiles}
                  currentId={contact.coordinator_id}
                  action={saveContactCoordinator}
                  placeholder="Sin coordinador asignado"
                />
              </CardContent>
            </Card>
          )}

          {/* Commission 6 assignment — owner only */}
          {isOwner && (
            <Card>
              <CardHeader>
                <CardTitle>Comisión 6</CardTitle>
                <span className="text-xs text-[#9CA3AF]">Comisión adicional</span>
              </CardHeader>
              <CardContent className="p-0">
                <ProfileAssignSelect
                  contactId={contact.id}
                  profiles={com6Profiles}
                  currentId={contact.commission_6_id}
                  action={saveContactCommission6}
                  placeholder="Sin asignar"
                />
              </CardContent>
            </Card>
          )}

          {/* Payment data + SEPA — owner only */}
          {isOwner && (
            <Card>
              <CardHeader>
                <CardTitle>Datos de cobro</CardTitle>
                <span className="text-xs text-[#9CA3AF]">Solo visible para ti</span>
              </CardHeader>
              <CardContent>
                <PaymentForm
                  contactId={contact.id}
                  initialMethod={contact.payment_method}
                  initialIban={contact.iban}
                  initialBic={contact.bic}
                />
              </CardContent>
            </Card>
          )}

          {/* Recent invoices */}
          {invoices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Facturas</CardTitle>
                <span className="text-xs text-[#9CA3AF]">Últimas {invoices.length}</span>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-[#F3F4F6]">
                  {invoices.map((inv) => (
                    <li key={inv.id}>
                      <Link
                        href={`/dashboard/facturas/${inv.id}`}
                        className="flex items-center justify-between px-5 py-3 hover:bg-[#F9FAFB] transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#0A0A0A] truncate">
                            {inv.doc_number ?? inv.id.slice(0, 8) + "…"}
                          </p>
                          <p className="text-xs text-[#9CA3AF]">{fmtDate(inv.date)}</p>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1 ml-3">
                          <span className="text-xs font-semibold text-[#0A0A0A] tabular-nums">
                            {fmtCurrency(inv.total)}
                          </span>
                          <Badge variant={statusVariant[inv.status] ?? "neutral"}>
                            {statusLabel[inv.status] ?? "—"}
                          </Badge>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Pedidos en curso ─────────────────────────────────────────── */}
      {(() => {
        const fmtEuro = (n: number) =>
          new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);
        const fmtDate = (iso: string | null) =>
          iso ? new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

        const badge = openOrders.length > 0
          ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{openOrders.length} abierto{openOrders.length !== 1 ? "s" : ""}</span>
          : undefined;

        return (
          <CollapsibleCard title="Pedidos en curso" subtitle="Pendientes de facturar" badge={badge} defaultOpen={openOrders.length > 0}>
            {openOrders.length === 0 ? (
              <div className="px-5 py-6 text-center space-y-2">
                <p className="text-xs text-[#9CA3AF]">Sin pedidos en curso para este cliente.</p>
                <Link href="/dashboard/pedidos/nuevo" className="text-xs font-medium text-[#8E0E1A] hover:underline">
                  Crear pedido →
                </Link>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    {["Pedido", "Fecha", "Importe", "Estado"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {openOrders.map(o => {
                    const st = orderStatus(o.status);
                    return (
                      <tr key={o.id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-[#0A0A0A] whitespace-nowrap">
                          {o.doc_number ?? <span className="text-[#D1D5DB]">—</span>}
                        </td>
                        <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">{fmtDate(o.date)}</td>
                        <td className="px-4 py-3 tabular-nums font-semibold text-[#0A0A0A] whitespace-nowrap">{fmtEuro(o.total)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant={st.variant === "success" ? "success" : st.variant === "warning" ? "warning" : "neutral"}>
                            {st.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CollapsibleCard>
        );
      })()}

    </div>
  );
}
