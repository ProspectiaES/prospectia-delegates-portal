import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { OwnerDashboard, type OwnerKpis } from "./OwnerDashboard";
import { getProfile } from "@/lib/profile";

// ─── Owner data loader ────────────────────────────────────────────────────────

async function loadOwnerData(year: number, month: number): Promise<OwnerKpis> {
  const admin = createAdminClient();
  const now   = new Date();

  const periodStart   = new Date(year, month - 1, 1);
  const periodEnd     = new Date(year, month, 0, 23, 59, 59, 999);
  const ytdStart      = new Date(year, 0, 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);

  const [
    { data: allContacts },
    { data: allInvoices },
    { data: periodOrders },
    { data: openOrders },
    { data: allDelegates },
    { data: cdRows },
    { data: lastSync },
  ] = await Promise.all([
    admin.from("holded_contacts").select("id, first_synced_at"),
    admin.from("holded_invoices")
      .select("contact_id, date, date_paid, due_date, status, subtotal, units_total, units_foc")
      .eq("is_credit_note", false),
    admin.from("holded_salesorders")
      .select("id, status")
      .gte("date", periodStart.toISOString())
      .lte("date", periodEnd.toISOString()),
    admin.from("holded_salesorders")
      .select("id, status")
      .lt("status", 3),
    admin.from("profiles").select("id, created_at").eq("role", "DELEGATE"),
    admin.from("contact_delegates").select("contact_id, delegate_id"),
    admin.from("holded_sync_log")
      .select("finished_at")
      .eq("status", "completed")
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  type Inv = { contact_id: string | null; date: string | null; date_paid: string | null; due_date: string | null; status: number; subtotal: number | null; units_total: number; units_foc: number };
  const contacts  = allContacts  ?? [];
  const invoices  = (allInvoices ?? []) as Inv[];
  const delegates = allDelegates ?? [];
  const cd        = cdRows       ?? [];

  const sumSub = (arr: Inv[]) => arr.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);

  // Contacts KPIs
  const withRecentInvoice = new Set(
    invoices
      .filter(i => i.date && new Date(i.date) >= thirtyDaysAgo)
      .map(i => i.contact_id).filter(Boolean)
  );
  const activeContacts  = contacts.filter(c => withRecentInvoice.has(c.id)).length;
  const newContacts     = contacts.filter(c =>
    c.first_synced_at &&
    new Date(c.first_synced_at) >= periodStart &&
    new Date(c.first_synced_at) <= periodEnd
  ).length;

  // Billing KPIs
  const periodEmitted = invoices.filter(i => i.date && new Date(i.date) >= periodStart && new Date(i.date) <= periodEnd && i.status > 0);
  const periodPaid    = invoices.filter(i => i.date_paid && i.status === 3 && new Date(i.date_paid) >= periodStart && new Date(i.date_paid) <= periodEnd);
  const allPending    = invoices.filter(i => i.status === 1);
  const allOverdue    = invoices.filter(i => i.status === 2);

  const overdueDays   = allOverdue.map(i => i.due_date ? Math.floor((now.getTime() - new Date(i.due_date).getTime()) / 86_400_000) : 0);
  const oldestDays    = overdueDays.length ? Math.max(...overdueDays) : 0;
  const avgDays       = overdueDays.length ? Math.round(overdueDays.reduce((a, b) => a + b, 0) / overdueDays.length) : 0;

  // Delegates KPIs
  const delegateContactMap = new Map<string, Set<string>>();
  for (const row of cd) {
    if (!delegateContactMap.has(row.delegate_id)) delegateContactMap.set(row.delegate_id, new Set());
    delegateContactMap.get(row.delegate_id)!.add(row.contact_id);
  }
  const activeDelegates = delegates.filter(d => {
    const cids = delegateContactMap.get(d.id);
    return cids && [...cids].some(cid => withRecentInvoice.has(cid));
  }).length;
  const newDelegates = delegates.filter(d =>
    d.created_at && new Date(d.created_at) >= periodStart && new Date(d.created_at) <= periodEnd
  ).length;

  // Annual KPIs
  const ytdEmitted = invoices.filter(i => i.date && new Date(i.date) >= ytdStart && i.status > 0);
  const ytdPaid    = invoices.filter(i => i.date_paid && new Date(i.date_paid) >= ytdStart && i.status === 3);

  return {
    period: { year, month },
    contacts: {
      total:       contacts.length,
      active:      activeContacts,
      newInPeriod: newContacts,
      dormant:     contacts.length - activeContacts,
    },
    billing: {
      emitted: { count: periodEmitted.length, total: sumSub(periodEmitted) },
      paid:    { count: periodPaid.length,    total: sumSub(periodPaid)    },
      pending: { count: allPending.length,    total: sumSub(allPending)   },
      overdue: { count: allOverdue.length,    total: sumSub(allOverdue), oldestDays, avgDays },
    },
    orders: {
      periodCount: (periodOrders ?? []).length,
      inProcess:   (openOrders   ?? []).filter(o => o.status === 1).length,
      shipped:     (openOrders   ?? []).filter(o => o.status === 2).length,
    },
    delegates: {
      total:       delegates.length,
      active:      activeDelegates,
      newInPeriod: newDelegates,
      dormant:     delegates.length - activeDelegates,
    },
    annual: {
      year,
      units:    ytdEmitted.reduce((s, i) => s + (Number(i.units_total) || 0), 0),
      unitsFoc: ytdEmitted.reduce((s, i) => s + (Number(i.units_foc)   || 0), 0),
      base:     sumSub(ytdEmitted),
      paid:    { count: ytdPaid.length,    total: sumSub(ytdPaid)    },
      pending: { count: allPending.length, total: sumSub(allPending) },
      overdue: { count: allOverdue.length, total: sumSub(allOverdue), oldestDays, avgDays },
    },
    lastSyncedAt: (lastSync as { finished_at?: string } | null)?.finished_at ?? null,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage(
  { searchParams }: { searchParams: Promise<{ month?: string }> }
) {
  const params  = await searchParams;
  const profile = await getProfile();

  // ── Parse period (shared by both delegate and owner) ────────────────────────
  const now   = new Date();
  let year    = now.getFullYear();
  let month   = now.getMonth() + 1;
  if (params.month && /^\d{4}-\d{2}$/.test(params.month)) {
    const [y, m] = params.month.split("-").map(Number);
    if (y >= 2020 && m >= 1 && m <= 12) { year = y; month = m; }
  }

  // ── Owner branch ─────────────────────────────────────────────────────────────
  if (profile?.role === "OWNER" || profile?.role === "ADMIN") {
    const kpis = await loadOwnerData(year, month);
    return <OwnerDashboard kpis={kpis} />;
  }

  // ── Delegate branch — redirect to their own profile page ────────────────────
  if (profile?.role === "DELEGATE") {
    redirect(`/dashboard/delegados/${profile.id}`);
  }

  // ── Unauthenticated / unknown role ───────────────────────────────────────────
  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8">
      <p className="text-sm text-[#6B7280]">Sin acceso al dashboard.</p>
    </div>
  );
}
