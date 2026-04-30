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
import { DelegateProfileAssignSelect } from "./DelegateProfileAssignSelect";
import { RiesgoClientesCard } from "./RiesgoClientesCard";
import { ActividadClientesCard } from "./ActividadClientesCard";
import { ComisionesCard } from "./ComisionesCard";
import { buildCommissionBlock } from "./commissionCalc";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DelegateProfile {
  id: string;
  full_name: string;
  delegate_name: string | null;
  role: string;
  is_kol: boolean;
  show_in_delegate_list: boolean;
  created_at: string;
  email: string | null;
  phone: string | null;
  nif: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  iban: string | null;
  kol_id: string | null;
  coordinator_id: string | null;
  contact_id: string | null;
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
  searchParams: Promise<{ mes?: string }>;
}

export default async function DelegadoDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { mes: mesParam } = await searchParams;

  const [profile, admin] = await Promise.all([getProfile(), Promise.resolve(createAdminClient())]);
  const supabase = await createClient();

  // Load delegate profile via admin (billing columns bypass RLS)
  const { data: delegateData } = await admin
    .from("profiles")
    .select("id, full_name, delegate_name, role, is_kol, show_in_delegate_list, created_at, email, phone, nif, address, city, postal_code, iban, kol_id, coordinator_id, contact_id")
    .eq("id", id)
    .maybeSingle();

  // Allow DELEGATE role or OWNER profiles flagged as delegate (PROSPECTIA CASA)
  if (!delegateData || (delegateData.role !== "DELEGATE" && !delegateData.show_in_delegate_list)) notFound();

  const delegate = delegateData as DelegateProfile;
  const isOwner  = profile?.role === "OWNER";

  // Load contact IDs assigned to this delegate
  const { data: cdRows } = await supabase
    .from("contact_delegates")
    .select("contact_id")
    .eq("delegate_id", id);

  const contactIds = (cdRows ?? []).map((r) => r.contact_id as string).filter(Boolean);

  // KOL and Coordinator options (for OWNER assignment widgets)
  const [kolOptions, coordOptions] = isOwner
    ? await Promise.all([
        admin.from("profiles").select("id, full_name, delegate_name").or("is_kol.eq.true,role.eq.KOL").order("full_name"),
        admin.from("profiles").select("id, full_name, delegate_name").or("is_coordinator.eq.true,role.eq.COORDINATOR").order("full_name"),
      ])
    : [{ data: [] }, { data: [] }];

  const kolProfiles   = (kolOptions.data   ?? []).map((p: { id: string; full_name: string; delegate_name: string | null }) => ({ id: p.id, display_name: p.delegate_name ?? p.full_name }));
  const coordProfiles = (coordOptions.data ?? []).map((p: { id: string; full_name: string; delegate_name: string | null }) => ({ id: p.id, display_name: p.delegate_name ?? p.full_name }));

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
          .select("id, doc_number, contact_id, contact_name, date, due_date, date_paid, total, status")
          .in("contact_id", contactIds)
          .eq("is_credit_note", false)
          .order("date", { ascending: false })
      : Promise.resolve({ data: [] as DelegateInvoice[] }),
    admin
      .from("bixgrow_affiliates")
      .select("id, email, first_name, last_name, status, referral_code, program, delegate_id")
      .order("email"),
  ]);

  const clients       = (clientsRes.data      ?? []) as DbContact[];
  const invoices      = (invoicesRes.data     ?? []) as DelegateInvoice[];
  const allAffiliates = (allAffiliatesRes.data ?? []) as DbAffiliate[];

  // ── Dates & period ──────────────────────────────────────────────────────────
  const now = new Date();
  const nowMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  let pYear  = now.getFullYear();
  let pMonth = now.getMonth(); // 0-indexed
  if (mesParam && /^\d{4}-\d{2}$/.test(mesParam)) {
    const [y, m] = mesParam.split("-").map(Number);
    pYear = y; pMonth = m - 1;
  }
  const mesStr      = `${pYear}-${String(pMonth + 1).padStart(2, "0")}`;
  const isCurrentMes = mesStr === nowMes;
  const periodStart = new Date(Date.UTC(pYear, pMonth, 1)).toISOString();
  const periodEnd   = new Date(Date.UTC(pYear, pMonth + 1, 0, 23, 59, 59, 999)).toISOString();

  // ── Extra data for risk / activity / commissions ────────────────────────────

  // Riesgo data
  const vencidas = invoices
    .filter((inv) => inv.status === 2 && inv.due_date)
    .map((inv) => ({
      invoiceId: inv.id,
      docNumber: inv.doc_number ?? inv.id.slice(0, 8),
      contactId: inv.contact_id,
      contactName: inv.contact_name ?? "—",
      total: inv.total,
      dueDate: inv.due_date!,
      daysOverdue: Math.floor((now.getTime() - new Date(inv.due_date!).getTime()) / 86_400_000),
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  const pendientes = invoices
    .filter((inv) => inv.status === 1)
    .map((inv) => ({
      invoiceId: inv.id,
      docNumber: inv.doc_number ?? inv.id.slice(0, 8),
      contactId: inv.contact_id,
      contactName: inv.contact_name ?? "—",
      total: inv.total,
      dueDate: inv.due_date ?? null,
      daysUntilDue: inv.due_date
        ? Math.floor((new Date(inv.due_date).getTime() - now.getTime()) / 86_400_000)
        : null,
    }))
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  // Actividad data
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const clientLastActivity: Record<string, string> = {};
  for (const inv of invoices) {
    if (inv.contact_id && inv.date) {
      if (!clientLastActivity[inv.contact_id] || inv.date > clientLastActivity[inv.contact_id]) {
        clientLastActivity[inv.contact_id] = inv.date;
      }
    }
  }
  const activos = clients
    .filter((c) => clientLastActivity[c.id] && clientLastActivity[c.id] >= thirtyDaysAgo)
    .map((c) => ({
      clientId: c.id, name: c.name,
      lastActivity: clientLastActivity[c.id],
      daysAgo: Math.floor((now.getTime() - new Date(clientLastActivity[c.id]).getTime()) / 86_400_000),
    }))
    .sort((a, b) => a.daysAgo - b.daysAgo);

  const dormidos = clients
    .filter((c) => !clientLastActivity[c.id] || clientLastActivity[c.id] < thirtyDaysAgo)
    .map((c) => ({
      clientId: c.id, name: c.name,
      lastActivity: clientLastActivity[c.id] ?? null,
      daysDormant: clientLastActivity[c.id]
        ? Math.floor((now.getTime() - new Date(clientLastActivity[c.id]).getTime()) / 86_400_000)
        : 999,
    }))
    .sort((a, b) => b.daysDormant - a.daysDormant);

  // Commissions: load products + paid invoices this month (raw) + credit notes
  const [allProductsRes, paidMonthInvRes, cnRes, contactsWithRecRes] = await Promise.all([
    admin.from("holded_products").select(
      "id, name, commission_delegate, commission_delegate_type, commission_recommender, commission_recommender_type, commission_4, commission_4_type"
    ),
    contactIds.length > 0
      ? supabase.from("holded_invoices").select("id, doc_number, contact_id, contact_name, date, total, raw")
          .in("contact_id", contactIds).eq("status", 3).eq("is_credit_note", false)
          .gte("date_paid", periodStart).lte("date_paid", periodEnd)
      : Promise.resolve({ data: [] }),
    // Credit notes for any contact ever assigned to this delegate (not period-limited —
    // a CN issued this month can cancel an invoice from a prior month)
    contactIds.length > 0
      ? supabase.from("holded_invoices").select("from_invoice_id")
          .in("contact_id", contactIds).eq("is_credit_note", true).not("from_invoice_id", "is", null)
      : Promise.resolve({ data: [] }),
    contactIds.length > 0
      ? supabase.from("holded_contacts").select("id, recommender_id").in("id", contactIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Build set of invoice IDs cancelled by a CN — matched by Holded's own from.id pointer
  const cancelledIds = new Set(
    ((cnRes.data ?? []) as { from_invoice_id: string | null }[])
      .map((r) => r.from_invoice_id)
      .filter(Boolean) as string[]
  );

  const productMap: Record<string, {
    id: string; name: string;
    commission_delegate: number | null; commission_delegate_type: "percent" | "amount";
    commission_recommender: number | null; commission_recommender_type: "percent" | "amount";
    commission_4: number | null; commission_4_type: "percent" | "amount";
  }> = {};
  for (const p of allProductsRes.data ?? []) productMap[p.id] = p as typeof productMap[string];

  const recommenderMap: Record<string, string | null> = {};
  for (const c of (contactsWithRecRes.data ?? []) as { id: string; recommender_id: string | null }[]) {
    recommenderMap[c.id] = c.recommender_id;
  }

  // Load recommender names
  const uniqueRecIds = [...new Set(Object.values(recommenderMap).filter(Boolean))] as string[];
  const recommenderNameMap: Record<string, string> = {};
  if (uniqueRecIds.length > 0) {
    const { data: recContacts } = await supabase
      .from("holded_contacts").select("id, name").in("id", uniqueRecIds);
    for (const rc of recContacts ?? []) recommenderNameMap[rc.id] = rc.name;
  }

  type PaidInvoice = {
    id: string; doc_number: string | null; contact_id: string | null;
    contact_name: string | null; date: string | null; total: number; raw: Record<string, unknown>;
  };

  const paidMonthInvoices = ((paidMonthInvRes.data ?? []) as PaidInvoice[])
    .filter((inv) => !cancelledIds.has(inv.id));

  const delegateBlock = buildCommissionBlock(
    "Delegado", paidMonthInvoices, productMap, recommenderMap, recommenderNameMap, "delegate"
  );
  const commissionBlocks = [delegateBlock];

  // KOL block: if delegate also has KOL role
  if (delegate.is_kol) {
    const { data: kolContactsData } = await supabase
      .from("holded_contacts").select("id, recommender_id").eq("kol_id", id);
    // Exclude the KOL's own contact — a KOL must not earn commission on themselves
    const kolContactIds = (kolContactsData ?? [])
      .map((c: { id: string }) => c.id)
      .filter((cid) => !delegate.contact_id || cid !== delegate.contact_id);

    const kolRecommenderMap: Record<string, string | null> = {};
    for (const c of kolContactsData ?? []) kolRecommenderMap[(c as { id: string; recommender_id: string | null }).id] = (c as { id: string; recommender_id: string | null }).recommender_id;

    let kolPaidInvoices: PaidInvoice[] = [];
    if (kolContactIds.length > 0) {
      const [kolInvRes, kolCnRes] = await Promise.all([
        supabase.from("holded_invoices").select("id, doc_number, contact_id, contact_name, date, total, raw")
          .in("contact_id", kolContactIds).eq("status", 3).eq("is_credit_note", false)
          .gte("date_paid", periodStart).lte("date_paid", periodEnd),
        supabase.from("holded_invoices").select("from_invoice_id")
          .in("contact_id", kolContactIds).eq("is_credit_note", true).not("from_invoice_id", "is", null),
      ]);
      const kolCancelledIds = new Set(
        ((kolCnRes.data ?? []) as { from_invoice_id: string | null }[])
          .map((r) => r.from_invoice_id).filter(Boolean) as string[]
      );
      kolPaidInvoices = ((kolInvRes.data ?? []) as PaidInvoice[])
        .filter((inv) => !kolCancelledIds.has(inv.id));
    }
    commissionBlocks.push(
      buildCommissionBlock("KOL", kolPaidInvoices, productMap, kolRecommenderMap, recommenderNameMap, "kol")
    );
  }

  const commissionPeriod = new Date(pYear, pMonth).toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  const assignedAffiliateIds = allAffiliates
    .filter((a) => a.delegate_id === id)
    .map((a) => a.id);
  const assignedAffiliates = allAffiliates.filter((a) => a.delegate_id === id);

  // Affiliate orders (admin bypasses OWNER-only RLS)
  type AffOrder = { affiliate_id: string; amount: number; commission: number; status: string };
  let affiliateOrders: AffOrder[] = [];
  if (assignedAffiliateIds.length > 0) {
    const { data: ordersData } = await admin
      .from("bixgrow_orders")
      .select("affiliate_id, amount, commission, status")
      .in("affiliate_id", assignedAffiliateIds);
    affiliateOrders = (ordersData ?? []) as AffOrder[];
  }

  // Per-affiliate order stats
  const affStats = new Map<string, { count: number; totalAmount: number; pending: number; liquidable: number; paid: number }>();
  for (const a of assignedAffiliates) {
    affStats.set(a.id, { count: 0, totalAmount: 0, pending: 0, liquidable: 0, paid: 0 });
  }
  for (const o of affiliateOrders) {
    const s = affStats.get(o.affiliate_id);
    if (!s) continue;
    s.count++;
    s.totalAmount += Number(o.amount);
    if (o.status === "pending") s.pending += Number(o.commission);
    else if (o.status === "approved" || o.status === "settled") s.liquidable += Number(o.commission);
    else if (o.status === "paid") s.paid += Number(o.commission);
  }

  const totalAffAmount    = affiliateOrders.reduce((s, o) => s + Number(o.amount), 0);
  const totalAffPending   = affiliateOrders.filter((o) => o.status === "pending").reduce((s, o) => s + Number(o.commission), 0);
  const totalAffLiquidable = affiliateOrders.filter((o) => o.status === "approved" || o.status === "settled").reduce((s, o) => s + Number(o.commission), 0);
  const totalAffPaid      = affiliateOrders.filter((o) => o.status === "paid").reduce((s, o) => s + Number(o.commission), 0);

  // Invoice KPIs
  const totalBilled   = invoices.reduce((s, inv) => s + inv.total, 0);
  const kpiCobradas   = invoices.filter((inv) => inv.status === 3);
  const kpiPendientes = invoices.filter((inv) => inv.status === 1);
  const kpiVencidas   = invoices.filter((inv) => inv.status === 2);
  const periodo       = kpiCobradas.filter((inv) => !!inv.date_paid && inv.date_paid >= periodStart && inv.date_paid <= periodEnd);

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
            <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">{delegate.delegate_name ?? delegate.full_name}</h1>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <Badge variant="default">Delegado</Badge>
              {delegate.city && <span className="text-xs text-[#6B7280]">{delegate.city}</span>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
            <p className="text-xs text-[#9CA3AF]">Alta: {fmtDate(delegate.created_at)}</p>
            <a
              href={`/api/delegados/${id}/liquidacion${isCurrentMes ? "" : `?mes=${mesStr}`}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-[#8E0E1A] text-xs font-semibold text-[#8E0E1A] hover:bg-[#8E0E1A] hover:text-white transition-colors duration-150"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path d="M8 2v9M5 8l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 13h10" strokeLinecap="round" />
              </svg>
              Liquidación PDF
            </a>
          </div>
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
            {fmtCurrency(kpiPendientes.reduce((s, inv) => s + inv.total, 0))}
          </p>
          <p className="mt-0.5 text-xs text-[#9CA3AF]">{kpiPendientes.length} facturas</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm px-4 py-4">
          <p className="text-xs font-medium text-[#8E0E1A] uppercase tracking-wide">Vencidas</p>
          <p className="mt-1.5 text-xl font-bold text-[#0A0A0A] tabular-nums">
            {fmtCurrency(kpiVencidas.reduce((s, inv) => s + inv.total, 0))}
          </p>
          <p className="mt-0.5 text-xs text-[#9CA3AF]">{vencidas.length} facturas</p>
        </div>
      </div>

      {/* Main grid: left col (billing + KOL/Coord) + right col (clients + affiliates) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column */}
        <div className="space-y-4">
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
                    { label: "Email",      value: delegate.email },
                    { label: "Teléfono",   value: delegate.phone },
                    { label: "NIF",        value: delegate.nif },
                    { label: "Ciudad",     value: delegate.city },
                    { label: "Dirección",  value: delegate.address },
                    { label: "C.P.",       value: delegate.postal_code },
                    { label: "IBAN",       value: delegate.iban },
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

          {isOwner && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>KOL asignado</CardTitle>
                  <span className="text-xs text-[#9CA3AF]">Key Opinion Leader</span>
                </CardHeader>
                <CardContent className="p-0">
                  <DelegateProfileAssignSelect
                    delegateId={id}
                    profiles={kolProfiles}
                    currentId={delegate.kol_id}
                    field="kol"
                    placeholder="Sin KOL asignado"
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Coordinador asignado</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <DelegateProfileAssignSelect
                    delegateId={id}
                    profiles={coordProfiles}
                    currentId={delegate.coordinator_id}
                    field="coordinator"
                    placeholder="Sin coordinador asignado"
                  />
                </CardContent>
              </Card>
            </>
          )}
        </div>

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
              <CardTitle>Afiliados</CardTitle>
              <span className="text-xs text-[#9CA3AF]">{assignedAffiliateIds.length} afiliado{assignedAffiliateIds.length !== 1 ? "s" : ""}</span>
            </CardHeader>

            {/* Affiliate billing KPIs */}
            {assignedAffiliateIds.length > 0 && (
              <div className="px-5 py-4 border-b border-[#F3F4F6] grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#F9FAFB] rounded-lg px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide">Facturado</p>
                  <p className="mt-1 text-sm font-bold text-[#0A0A0A] tabular-nums">{fmtCurrency(totalAffAmount)}</p>
                  <p className="text-[10px] text-[#9CA3AF]">{affiliateOrders.length} órdenes</p>
                </div>
                <div className="bg-[#F9FAFB] rounded-lg px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-[#F59E0B] uppercase tracking-wide">Pendiente</p>
                  <p className="mt-1 text-sm font-bold text-[#0A0A0A] tabular-nums">{fmtCurrency(totalAffPending)}</p>
                  <p className="text-[10px] text-[#9CA3AF]">Por aprobar</p>
                </div>
                <div className="bg-[#F9FAFB] rounded-lg px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide">Por liquidar</p>
                  <p className="mt-1 text-sm font-bold text-[#0A0A0A] tabular-nums">{fmtCurrency(totalAffLiquidable)}</p>
                  <p className="text-[10px] text-[#9CA3AF]">Aprobadas</p>
                </div>
                <div className="bg-[#F9FAFB] rounded-lg px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Cobrado</p>
                  <p className="mt-1 text-sm font-bold text-[#0A0A0A] tabular-nums">{fmtCurrency(totalAffPaid)}</p>
                  <p className="text-[10px] text-[#9CA3AF]">Pagado</p>
                </div>
              </div>
            )}

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
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                        {["Afiliado", "Código", "Órdenes", "Facturado", "Por liquidar", "Cobrado", ""].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3F4F6]">
                      {assignedAffiliates.map((a) => {
                        const name = [a.first_name, a.last_name].filter(Boolean).join(" ") || a.email;
                        const st = affStats.get(a.id) ?? { count: 0, totalAmount: 0, pending: 0, liquidable: 0, paid: 0 };
                        return (
                          <tr key={a.id} className="hover:bg-[#F9FAFB] transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <p className="text-sm font-medium text-[#0A0A0A]">{name}</p>
                              <p className="text-xs text-[#6B7280]">{a.email}</p>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {a.referral_code
                                ? <code className="text-xs font-mono text-[#6B7280]">{a.referral_code}</code>
                                : <span className="text-[#D1D5DB] text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-[#6B7280] tabular-nums">
                              {st.count > 0 ? st.count : <span className="text-[#D1D5DB]">0</span>}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap tabular-nums font-medium text-[#0A0A0A]">
                              {st.totalAmount > 0 ? fmtCurrency(st.totalAmount) : <span className="text-[#D1D5DB] text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap tabular-nums text-[#6B7280]">
                              {st.liquidable > 0 ? fmtCurrency(st.liquidable) : <span className="text-[#D1D5DB] text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap tabular-nums text-emerald-700 font-medium">
                              {st.paid > 0 ? fmtCurrency(st.paid) : <span className="text-[#D1D5DB] text-xs font-normal">—</span>}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Link href={`/dashboard/afiliados/${a.id}`} className="text-xs font-medium text-[#6B7280] hover:text-[#8E0E1A] transition-colors">
                                Ver →
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {affiliateOrders.length > 0 && (
                      <tfoot>
                        <tr className="border-t border-[#E5E7EB] bg-[#F9FAFB]">
                          <td colSpan={3} className="px-4 py-2.5 text-xs text-[#6B7280]">{assignedAffiliates.length} afiliado{assignedAffiliates.length !== 1 ? "s" : ""}</td>
                          <td className="px-4 py-2.5 text-sm font-bold text-[#0A0A0A] tabular-nums">{fmtCurrency(totalAffAmount)}</td>
                          <td className="px-4 py-2.5 text-sm font-bold text-[#0A0A0A] tabular-nums">{fmtCurrency(totalAffLiquidable)}</td>
                          <td className="px-4 py-2.5 text-sm font-bold text-emerald-700 tabular-nums">{fmtCurrency(totalAffPaid)}</td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
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

      {/* Riesgo clientes */}
      <RiesgoClientesCard vencidas={vencidas} pendientes={pendientes} />

      {/* Actividad clientes */}
      <ActividadClientesCard activos={activos} dormidos={dormidos} />

      {/* Comisiones liquidables */}
      <ComisionesCard
        blocks={commissionBlocks}
        period={commissionPeriod}
        mesStr={mesStr}
        isCurrentMes={isCurrentMes}
        delegateId={id}
        pendientes={pendientes}
        vencidas={vencidas}
      />

    </div>
  );
}
