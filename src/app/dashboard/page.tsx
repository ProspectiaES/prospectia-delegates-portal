import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { KpiCard } from "@/components/ui/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SyncButton } from "@/components/SyncButton";
import { DelegateDashboard, type InvoiceRow } from "./DelegateDashboard";
import { getProfile } from "@/lib/profile";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbInvoice {
  id: string;
  doc_number: string | null;
  contact_name: string | null;
  date: string | null;
  total: number;
  status: number;
  last_synced_at: string;
}

interface SyncLog {
  sync_type: string;
  status: string;
  contacts_synced: number;
  invoices_synced: number;
  finished_at: string | null;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtNumber   = (n: number) => new Intl.NumberFormat("es-ES").format(n);
const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const fmtPercent  = (n: number) => `${n.toFixed(1).replace(".", ",")}%`;

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "hace un momento";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

const statusLabel: Record<number, string> = {
  0: "Borrador", 1: "Pendiente", 2: "Vencida", 3: "Cobrada",
};
const statusVariant: Record<number, "neutral" | "warning" | "danger" | "success"> = {
  0: "neutral", 1: "warning", 2: "danger", 3: "success",
};

// ─── Delegate data loader ─────────────────────────────────────────────────────

async function loadDelegateData(delegateId: string, year: number, month: number) {
  const admin = createAdminClient();
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd   = new Date(year, month, 0, 23, 59, 59); // last day of month

  // 1. Delegate's contact IDs
  const { data: links } = await admin
    .from("contact_delegates")
    .select("contact_id")
    .eq("delegate_id", delegateId);
  const contactIds = (links ?? []).map(r => r.contact_id as string);

  if (contactIds.length === 0) {
    return { contactIds, contacts: [], invoices: [], orders: [] };
  }

  // 2. All contacts, invoices, orders in parallel
  const [{ data: contacts }, { data: invoices }, { data: orders }] = await Promise.all([
    admin
      .from("holded_contacts")
      .select("id, first_synced_at")
      .in("id", contactIds),
    admin
      .from("holded_invoices")
      .select("id, doc_number, contact_id, contact_name, date, due_date, date_last_modified, total, status")
      .in("contact_id", contactIds)
      .eq("is_credit_note", false)
      .order("date", { ascending: false }),
    admin
      .from("holded_salesorders")
      .select("id, contact_id, status, date")
      .in("contact_id", contactIds),
  ]);

  return {
    contactIds,
    contacts:  contacts  ?? [],
    invoices:  (invoices ?? []) as InvoiceRow[],
    orders:    orders    ?? [],
    periodStart,
    periodEnd,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage(
  { searchParams }: { searchParams: Promise<{ month?: string }> }
) {
  const params  = await searchParams;
  const [supabase, profile] = await Promise.all([createClient(), getProfile()]);
  const isOwner = profile?.role === "OWNER";

  // ── Delegate branch ─────────────────────────────────────────────────────────
  const isDelegate = profile?.role === "DELEGATE";
  if (isDelegate && profile) {
    const now   = new Date();
    let year    = now.getFullYear();
    let month   = now.getMonth() + 1;

    if (params.month && /^\d{4}-\d{2}$/.test(params.month)) {
      const [y, m] = params.month.split("-").map(Number);
      if (y >= 2020 && m >= 1 && m <= 12) { year = y; month = m; }
    }

    const { contacts, invoices, orders, periodStart, periodEnd } =
      await loadDelegateData(profile.id, year, month);

    const today = new Date();
    const ninetyDaysAgo = new Date(today.getTime() - 90 * 86_400_000);

    // Period invoices
    const periodInvoices = invoices.filter(inv => {
      const d = new Date(inv.date);
      return d >= (periodStart!) && d <= (periodEnd!);
    });

    // Client KPIs
    const totalClients   = contacts.length;
    const newClients     = contacts.filter(c =>
      c.first_synced_at && new Date(c.first_synced_at) >= (periodStart!) && new Date(c.first_synced_at) <= (periodEnd!)
    ).length;
    const activeContactIds = new Set(invoices.map(i => i.contact_id).filter(Boolean));
    const dormantClients = contacts.filter(c => {
      const lastInv = invoices
        .filter(i => i.contact_id === c.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      return !lastInv || new Date(lastInv.date) < ninetyDaysAgo;
    }).length;

    // Billing KPIs
    const paidPeriod    = periodInvoices.filter(i => i.status === 3);
    const overdueAll    = invoices.filter(i => i.status === 2);
    const pendingAll    = invoices.filter(i => i.status === 1);

    // Order KPIs
    const periodOrders  = (orders as Array<{ id: string; contact_id: string; status: number; date: string }>)
      .filter(o => { const d = new Date(o.date); return d >= (periodStart!) && d <= (periodEnd!); });

    const sum = (arr: InvoiceRow[]) => arr.reduce((s, r) => s + (Number(r.total) || 0), 0);

    void activeContactIds; // used implicitly via dormantClients

    return (
      <DelegateDashboard
        period={{ year, month }}
        totalClients={totalClients}
        newClients={newClients}
        dormantClients={dormantClients}
        emittedCount={periodInvoices.length}
        emittedTotal={sum(periodInvoices)}
        paidCount={paidPeriod.length}
        paidTotal={sum(paidPeriod)}
        overdueCount={overdueAll.length}
        overdueTotal={sum(overdueAll)}
        pendingCount={pendingAll.length}
        pendingTotal={sum(pendingAll)}
        ordersCount={periodOrders.length}
        ordersBilled={periodOrders.filter(o => o.status === 3).length}
        ordersInProcess={periodOrders.filter(o => o.status < 3).length}
        overdueRows={overdueAll}
        pendingRows={pendingAll}
        paidRows={paidPeriod}
      />
    );
  }
  // ── End delegate branch ─────────────────────────────────────────────────────

  const [
    { count: totalContacts },
    { data: invoices },
    { data: lastSync },
  ] = await Promise.all([
    supabase.from("holded_contacts").select("*", { count: "exact", head: true }),
    supabase
      .from("holded_invoices")
      .select("id, doc_number, contact_name, date, total, status, last_synced_at")
      .order("date", { ascending: false })
      .limit(8),
    isOwner
      ? supabase
          .from("holded_sync_log")
          .select("sync_type, status, contacts_synced, invoices_synced, finished_at")
          .eq("status", "completed")
          .order("finished_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const { data: aggData } = await supabase.from("holded_invoices").select("total, status");

  const allInvoices   = aggData ?? [];
  const totalInvoiced = allInvoices.reduce((s, r) => s + (r.total ?? 0), 0);
  const billable      = allInvoices.filter((r) => r.status > 0);
  const paid          = allInvoices.filter((r) => r.status === 3);
  const convRate      = billable.length > 0 ? (paid.length / billable.length) * 100 : 0;

  const hasSynced  = (totalContacts ?? 0) > 0 || allInvoices.length > 0;
  const syncLog    = lastSync as SyncLog | null;
  const recentDocs = (invoices ?? []) as DbInvoice[];

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-8">

      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-[#6B7280]">Contactos, puntos de venta y comisiones.</p>
        </div>
        {isOwner && (
          <div className="flex items-center gap-3">
            {syncLog && (
              <span className="text-xs text-[#9CA3AF]">
                Último sync: {relativeTime(syncLog.finished_at)}
              </span>
            )}
            <SyncButton lastSyncedAt={syncLog?.finished_at ?? null} endpoint="/api/holded/sync" label="Sincronizar" />
          </div>
        )}
      </div>

      {/* Empty state */}
      {!hasSynced && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white px-6 py-12 text-center shadow-sm">
          <div className="w-10 h-10 rounded-full bg-[#F3F4F6] flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M10 4v8M10 14v2" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="10" cy="10" r="8.5" stroke="#6B7280" strokeWidth="1.5" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-[#0A0A0A]">Sin datos sincronizados</p>
          <p className="mt-1 text-xs text-[#6B7280] max-w-xs mx-auto">
            Pulsa «Sincronizar» para importar todos los contactos y facturas de Holded.
          </p>
        </div>
      )}

      {hasSynced && (
        <>
          {/* KPIs */}
          <section aria-label="Indicadores clave">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Contactos"
                value={fmtNumber(totalContacts ?? 0)}
                subtext="importados de Holded"
                accent
              />
              <KpiCard
                label="Facturas emitidas"
                value={fmtNumber(allInvoices.length)}
                subtext={`${fmtNumber(billable.length)} emitidas`}
              />
              <KpiCard
                label="Total facturado"
                value={fmtCurrency(totalInvoiced)}
                subtext={`${fmtNumber(paid.length)} cobradas`}
              />
              <KpiCard
                label="Tasa de cobro"
                value={billable.length > 0 ? fmtPercent(convRate) : "—"}
                trend={convRate >= 80 ? "up" : convRate >= 50 ? "neutral" : "down"}
                trendValue={paid.length > 0 ? `${paid.length} pagadas` : undefined}
              />
            </div>
          </section>

          {/* Bottom grid */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Facturas recientes — 2/3 */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Facturas recientes</CardTitle>
                <span className="text-xs text-[#9CA3AF]">Últimas {recentDocs.length}</span>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-[#F3F4F6]">
                  {recentDocs.map((doc, i) => (
                    <li
                      key={doc.id}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#F9FAFB] transition-colors"
                    >
                      <span className="w-5 shrink-0 text-xs tabular-nums text-[#9CA3AF] text-right font-mono">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0A0A0A] leading-snug truncate">
                          {doc.contact_name ?? "Sin nombre"}
                        </p>
                        <p className="text-xs text-[#6B7280] mt-0.5">
                          {doc.doc_number ? `Factura ${doc.doc_number}` : `ID ${doc.id.slice(0, 10)}…`}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-[#0A0A0A] tabular-nums">
                        {fmtCurrency(doc.total)}
                      </span>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <Badge variant={statusVariant[doc.status] ?? "neutral"}>
                          {statusLabel[doc.status] ?? "—"}
                        </Badge>
                        <span className="text-xs text-[#9CA3AF]">{relativeTime(doc.date)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Sincronización — 1/3 */}
            <Card>
              <CardHeader>
                <CardTitle>Sincronización</CardTitle>
                <Badge variant="success" dot>Activa</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-[#F3F4F6]">
                  {[
                    { label: "Intervalo completo",   value: "Cada 15 min" },
                    { label: "Actualización estado", value: "Cada 4 h"    },
                    { label: "Contactos",            value: fmtNumber(totalContacts ?? 0) },
                    { label: "Facturas",             value: fmtNumber(allInvoices.length) },
                    {
                      label: "Último sync",
                      value: syncLog?.sync_type === "full"
                        ? relativeTime(syncLog.finished_at)
                        : "—",
                    },
                  ].map(({ label, value }) => (
                    <li key={label} className="flex items-center justify-between px-5 py-3">
                      <span className="text-xs text-[#6B7280]">{label}</span>
                      <span className="text-xs font-semibold text-[#0A0A0A] tabular-nums">{value}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

          </section>
        </>
      )}
    </div>
  );
}
