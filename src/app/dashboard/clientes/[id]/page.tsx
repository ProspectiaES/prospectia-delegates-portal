import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import RemesesClientPanel from "@/components/remeses/RemesesClientPanel";
import { Badge } from "@/components/ui/Badge";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { orderStatus } from "@/lib/holded/api";
import { ContactEditForm } from "./ContactEditForm";
import { DelegateAssignment } from "./DelegateAssignment";
import { AffiliateSelect } from "./AffiliateSelect";
import { RecommenderSelect } from "./RecommenderSelect";
import { ProfileAssignSelect } from "./ProfileAssignSelect";
import { saveContactKOL, saveContactCoordinator, saveContactCommission6 } from "@/app/actions/contacts";
import { getProfile } from "@/lib/profile";
import { ClienteCRMPanel, CreateProspectoButton, type CRMActivity } from "./ClienteCRMPanel";
import { InternacionalToggle } from "./InternacionalToggle";

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
  is_internacional: boolean;
  first_synced_at: string;
  last_synced_at: string;
  raw: Record<string, unknown>;
}

interface DbInvoice {
  id: string;
  doc_number: string | null;
  date: string | null;
  due_date: string | null;
  date_paid: string | null;
  total: number;
  subtotal: number | null;
  status: number;
  is_credit_note: boolean;
  raw: Record<string, unknown> | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtEuro = (n: number) =>
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

function pendingAmount(inv: DbInvoice): number {
  if (inv.status === 3) return 0;
  const raw = (inv.raw ?? {}) as Record<string, unknown>;
  const pp = typeof raw.paymentsPending === "number" ? raw.paymentsPending : null;
  return pp !== null && pp > 0.02 ? pp : inv.total;
}

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
      .select("id, name, code, email, phone, mobile, type, tags, address, city, postal_code, province, country, country_code, affiliate_id, recommender_id, payment_method, iban, bic, kol_id, coordinator_id, commission_6_id, is_internacional, first_synced_at, last_synced_at, raw")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("holded_invoices")
      .select("id, doc_number, date, due_date, date_paid, total, subtotal, status, is_credit_note, raw")
      .eq("contact_id", id)
      .order("date", { ascending: false }),
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
      admin.from("profiles").select("id, full_name, delegate_name").or("is_kol.eq.true,role.eq.KOL").order("full_name"),
      admin.from("profiles").select("id, full_name, delegate_name").or("is_coordinator.eq.true,role.eq.COORDINATOR").order("full_name"),
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
  const allInvoices = (invoicesData ?? []) as DbInvoice[];
  const openOrders = (ordersData ?? []) as { id: string; doc_number: string | null; date: string | null; total: number; status: number }[];

  const admin2 = createAdminClient();
  const { data: prospectoData } = await admin2
    .from("prospectos")
    .select("id, name, stage, notes, delegate_id, converted_at, profiles!prospectos_delegate_id_fkey(full_name)")
    .eq("holded_contact_id", id)
    .maybeSingle();
  const prospecto = prospectoData as {
    id: string; name: string; stage: string; notes: string | null;
    delegate_id: string; converted_at: string | null;
    profiles: { full_name?: string } | null;
  } | null;

  let crmActivities: CRMActivity[] = [];
  if (prospecto?.id) {
    const { data: acts } = await admin2
      .from("prospecto_activities")
      .select("id, type, title, notes, scheduled_at, completed_at")
      .eq("prospecto_id", prospecto.id)
      .order("created_at", { ascending: false })
      .limit(20);
    crmActivities = (acts ?? []) as CRMActivity[];
  }

  let currentRecommender: { id: string; name: string; code: string | null; email: string | null; city: string | null } | null = null;
  if (contact.recommender_id) {
    const { data: recData } = await supabase
      .from("holded_contacts")
      .select("id, name, code, email, city")
      .eq("id", contact.recommender_id)
      .maybeSingle();
    currentRecommender = recData ?? null;
  }

  // ─── Derived data ────────────────────────────────────────────────────────────

  const rawContact  = contact.raw as Record<string, unknown>;
  const rawDefaults = rawContact?.defaults as Record<string, unknown> | undefined;
  const salesTaxCode = typeof rawDefaults?.salesTax === "string" ? rawDefaults.salesTax : "";
  const initialRecargo = salesTaxCode.includes("s_rec");

  const location = [contact.city, contact.province, contact.country].filter(Boolean).join(", ");

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const isActive = allInvoices.some(inv => inv.date && new Date(inv.date) >= oneYearAgo);

  // ─── KPI calculations ────────────────────────────────────────────────────────

  const invoicesOnly  = allInvoices.filter(inv => !inv.is_credit_note);
  const totalCount    = invoicesOnly.length;
  const totalBilled   = invoicesOnly.reduce((s, inv) => s + inv.total, 0);
  const totalCobrado  = invoicesOnly.filter(inv => inv.status === 3).reduce((s, inv) => s + inv.total, 0);
  const totalPendiente = allInvoices.reduce((s, inv) => s + pendingAmount(inv), 0);

  const cobradas = allInvoices.filter(inv => inv.status === 3 && inv.date && inv.date_paid);
  const avgDays  = cobradas.length > 0
    ? Math.round(cobradas.reduce((s, inv) => {
        return s + (new Date(inv.date_paid!).getTime() - new Date(inv.date!).getTime()) / 86400000;
      }, 0) / cobradas.length)
    : null;

  // ─── Invoice table totals ────────────────────────────────────────────────────

  const tblSubtotal  = allInvoices.reduce((s, inv) => s + (inv.subtotal ?? 0), 0);
  const tblIva       = allInvoices.reduce((s, inv) => s + (inv.subtotal != null ? inv.total - inv.subtotal : 0), 0);
  const tblTotal     = allInvoices.reduce((s, inv) => s + inv.total, 0);
  const tblPendiente = allInvoices.reduce((s, inv) => s + pendingAmount(inv), 0);

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div>
        <Link
          href="/dashboard/clientes"
          className="inline-flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#8E0E1A] transition-colors mb-4"
        >
          ← Volver a clientes
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">{contact.name}</h1>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              {contact.type != null && (
                <Badge variant={typeVariant[contact.type] ?? "neutral"}>
                  {typeLabel[contact.type] ?? `Tipo ${contact.type}`}
                </Badge>
              )}
              {contact.code && (
                <span className="text-xs font-mono text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded">
                  {contact.code}
                </span>
              )}
              {location && (
                <span className="text-xs text-[#6B7280]">{location}</span>
              )}
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                isActive
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-[#F3F4F6] text-[#9CA3AF]"
              }`}>
                {isActive ? "Activo" : "Dormido"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {isOwner && (
              <p className="text-[10px] text-[#9CA3AF] text-right hidden sm:block">
                Sync: {fmtDate(contact.last_synced_at)}
              </p>
            )}
            <Link
              href="/dashboard/pedidos/nuevo"
              className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-[#8E0E1A] text-xs font-semibold text-white hover:bg-[#6B0A14] transition-colors"
            >
              + Nuevo pedido
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPI strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Facturas",          value: String(totalCount),               sub: null },
          { label: "Facturado",         value: fmtEuro(totalBilled),             sub: null },
          { label: "Cobrado",           value: fmtEuro(totalCobrado),            sub: null },
          { label: "Pendiente",         value: fmtEuro(totalPendiente),          sub: null, highlight: totalPendiente > 0 },
          { label: "Plazo medio cobro", value: avgDays != null ? `${avgDays}d` : "—", sub: avgDays != null ? "días de fecha a cobro" : "sin datos" },
        ].map(({ label, value, sub, highlight }) => (
          <div key={label} className={`rounded-xl border ${highlight ? "border-amber-200 bg-amber-50" : "border-[#E5E7EB] bg-white"} px-4 py-3 shadow-sm`}>
            <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">{label}</p>
            <p className={`text-lg font-bold tabular-nums mt-1 ${highlight ? "text-amber-700" : "text-[#0A0A0A]"}`}>{value}</p>
            {sub && <p className="text-[10px] text-[#9CA3AF] mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* ── CRM / Seguimiento ──────────────────────────────────── */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F3F4F6] bg-[#FAFAFA]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#8E0E1A]/10 flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#8E0E1A" strokeWidth="1.8">
                <path d="M8 2c-1.5 0-4 .8-4 3 0 1.5.8 2.5 2 3L4.5 14h7L10 8c1.2-.5 2-1.5 2-3 0-2.2-2.5-3-4-3z" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0A0A0A]">CRM / Seguimiento</p>
              {prospecto ? (
                <p className="text-[11px] text-[#6B7280]">
                  {prospecto.profiles?.full_name && `Delegado: ${prospecto.profiles.full_name}`}
                  {prospecto.converted_at && ` · Cliente desde ${new Date(prospecto.converted_at).toLocaleDateString("es-ES")}`}
                </p>
              ) : (
                <p className="text-[11px] text-amber-600">Sin prospecto CRM vinculado</p>
              )}
            </div>
          </div>
          {prospecto && (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Vinculado
            </span>
          )}
        </div>
        <div className="px-5 py-5">
          {prospecto ? (
            <ClienteCRMPanel
              prospectoId={prospecto.id}
              initialStage={prospecto.stage}
              activities={crmActivities}
              notes={prospecto.notes}
            />
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-[#374151]">Este cliente aún no tiene ficha CRM</p>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Crea un prospecto para registrar actividades, hacer seguimiento del pipeline y añadir eventos al calendario.
                </p>
              </div>
              <CreateProspectoButton contactId={contact.id} contactName={contact.name} />
            </div>
          )}
        </div>
      </div>

      {/* ── 2/3 + 1/3 grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Contact form — 2/3 */}
        <div className="lg:col-span-2 rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F3F4F6] bg-[#FAFAFA] flex items-center justify-between">
            <p className="text-sm font-semibold text-[#0A0A0A]">Datos del contacto</p>
            {isOwner && <span className="text-[11px] text-[#9CA3AF]">Editable · se guarda en Holded</span>}
          </div>
          <div className="px-5 py-5">
            <ContactEditForm
              contact={{
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
              }}
              isOwner={isOwner}
              initialRecargo={initialRecargo}
              initialPaymentMethod={contact.payment_method}
              initialIban={contact.iban}
              initialBic={contact.bic}
            />
          </div>
        </div>

        {/* Right panel — 1/3 */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden divide-y divide-[#F3F4F6]">

          {/* Delegados asignados */}
          {isOwner && (
            <div>
              <div className="px-5 py-3 bg-[#FAFAFA] border-b border-[#F3F4F6]">
                <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Delegados asignados</p>
              </div>
              <DelegateAssignment
                contactId={contact.id}
                delegates={allDelegates}
                assignedIds={assignedIds}
              />
            </div>
          )}

          {/* Canal comercial */}
          {(isOwner || isDelegate) && (
            <div>
              <div className="px-5 py-3 bg-[#FAFAFA] border-b border-[#F3F4F6]">
                <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Canal comercial</p>
              </div>
              <div className="divide-y divide-[#F3F4F6]">
                <AffiliateSelect
                  contactId={contact.id}
                  affiliates={allAffiliates}
                  currentAffiliateId={contact.affiliate_id}
                />
                <RecommenderSelect
                  contactId={contact.id}
                  currentRecommender={currentRecommender}
                />
              </div>
            </div>
          )}

          {/* Equipo asignado */}
          {isOwner && (
            <div>
              <div className="px-5 py-3 bg-[#FAFAFA] border-b border-[#F3F4F6]">
                <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Equipo asignado</p>
              </div>
              <div className="divide-y divide-[#F3F4F6]">
                <div>
                  <p className="px-5 pt-3 text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wider">KOL</p>
                  <ProfileAssignSelect
                    contactId={contact.id}
                    profiles={kolProfiles}
                    currentId={contact.kol_id}
                    action={saveContactKOL}
                    placeholder="Sin KOL asignado"
                  />
                </div>
                <div>
                  <p className="px-5 pt-3 text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wider">Coordinador</p>
                  <ProfileAssignSelect
                    contactId={contact.id}
                    profiles={coordProfiles}
                    currentId={contact.coordinator_id}
                    action={saveContactCoordinator}
                    placeholder="Sin coordinador"
                  />
                </div>
                <div>
                  <p className="px-5 pt-3 text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wider">Comisión 6</p>
                  <ProfileAssignSelect
                    contactId={contact.id}
                    profiles={com6Profiles}
                    currentId={contact.commission_6_id}
                    action={saveContactCommission6}
                    placeholder="Sin asignar"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Divisió Internacional */}
          {isOwner && (
            <div>
              <div className="px-5 py-3 bg-[#FAFAFA] border-b border-[#F3F4F6]">
                <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Divisió</p>
              </div>
              <InternacionalToggle contactId={contact.id} value={contact.is_internacional ?? false} />
            </div>
          )}
        </div>
      </div>

      {/* ── Historial de facturas ───────────────────────────────── */}
      {(() => {
        const invoiceBadge = allInvoices.length > 0
          ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">{allInvoices.length}</span>
          : undefined;

        return (
          <CollapsibleCard
            title="Historial de facturas"
            subtitle="Todas las facturas y notas de crédito"
            badge={invoiceBadge}
            defaultOpen={allInvoices.length > 0 && allInvoices.length <= 50}
          >
            {allInvoices.length === 0 ? (
              <p className="px-5 py-6 text-xs text-[#9CA3AF] text-center">Sin facturas para este cliente.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                      {["N.º Factura", "Tipo", "Emisión", "Vencimiento", "F. Cobro", "Días", "Base imp.", "IVA", "Total", "Pendiente", "Estado"].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F4F6]">
                    {allInvoices.map(inv => {
                      const isCN  = inv.is_credit_note;
                      const isVoid = inv.status === 0;
                      const rawInv = (inv.raw ?? {}) as Record<string, unknown>;
                      const isAnulada = typeof rawInv.status === "number" && rawInv.status === 3 && inv.status === 0;

                      const daysPaid = inv.status === 3 && inv.date && inv.date_paid
                        ? Math.round((new Date(inv.date_paid).getTime() - new Date(inv.date).getTime()) / 86400000)
                        : null;
                      const iva = inv.subtotal != null ? inv.total - inv.subtotal : null;
                      const pending = pendingAmount(inv);

                      return (
                        <tr
                          key={inv.id}
                          className={[
                            "transition-colors",
                            isAnulada ? "opacity-50" : "",
                            isCN ? "bg-orange-50/40 hover:bg-orange-50" : "hover:bg-[#F9FAFB]",
                          ].join(" ")}
                        >
                          <td className="px-3 py-2.5 font-mono font-semibold whitespace-nowrap">
                            <Link href={`/dashboard/facturas/${inv.id}`} className="text-[#0A0A0A] hover:text-[#8E0E1A] transition-colors">
                              {inv.doc_number ?? inv.id.slice(0, 8) + "…"}
                            </Link>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isCN
                                ? "bg-orange-100 text-orange-700"
                                : "bg-[#F3F4F6] text-[#6B7280]"
                            }`}>
                              {isCN ? "NC" : "FAC"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-[#6B7280] whitespace-nowrap">{fmtDate(inv.date)}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className={inv.status === 2 ? "text-[#8E0E1A] font-medium" : "text-[#6B7280]"}>
                              {fmtDate(inv.due_date)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {inv.status === 3 && inv.date_paid
                              ? <span className="text-emerald-700 font-medium">{fmtDate(inv.date_paid)}</span>
                              : <span className="text-[#D1D5DB]">—</span>
                            }
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                            {daysPaid !== null
                              ? <span className="text-[#6B7280]">{daysPaid}d</span>
                              : <span className="text-[#D1D5DB]">—</span>
                            }
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-right text-[#374151]">
                            {inv.subtotal != null ? fmtEuro(inv.subtotal) : <span className="text-[#D1D5DB]">—</span>}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-right text-[#374151]">
                            {iva != null ? fmtEuro(iva) : <span className="text-[#D1D5DB]">—</span>}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-right font-semibold text-[#0A0A0A]">
                            {fmtEuro(inv.total)}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-right">
                            {pending > 0.02
                              ? <span className="text-amber-700 font-semibold">{fmtEuro(pending)}</span>
                              : <span className="text-[#D1D5DB]">—</span>
                            }
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <Badge variant={statusVariant[inv.status] ?? "neutral"}>
                              {statusLabel[inv.status] ?? "—"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-[#E5E7EB] bg-[#F9FAFB]">
                      <td colSpan={6} className="px-3 py-2 text-[11px] text-[#6B7280]">
                        {allInvoices.length} documento{allInvoices.length !== 1 ? "s" : ""}
                      </td>
                      <td className="px-3 py-2 text-right text-[11px] font-semibold text-[#0A0A0A] tabular-nums whitespace-nowrap">
                        {fmtEuro(tblSubtotal)}
                      </td>
                      <td className="px-3 py-2 text-right text-[11px] font-semibold text-[#0A0A0A] tabular-nums whitespace-nowrap">
                        {fmtEuro(tblIva)}
                      </td>
                      <td className="px-3 py-2 text-right text-[11px] font-bold text-[#0A0A0A] tabular-nums whitespace-nowrap">
                        {fmtEuro(tblTotal)}
                      </td>
                      <td className="px-3 py-2 text-right text-[11px] font-semibold text-amber-700 tabular-nums whitespace-nowrap">
                        {tblPendiente > 0.02 ? fmtEuro(tblPendiente) : "—"}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CollapsibleCard>
        );
      })()}

      {/* ── Pedidos en curso ─────────────────────────────────────── */}
      {(() => {
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
                        <td className="px-4 py-3 text-xs text-[#6B7280] whitespace-nowrap">{fmtDate(o.date)}</td>
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

      {/* Remeses SEPA traceability — only shown to OWNER */}
      {profile?.role === "OWNER" && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-[#0A0A0A]">Remeses SEPA</h3>
          <RemesesClientPanel contactId={id} />
        </div>
      )}

    </div>
  );
}
