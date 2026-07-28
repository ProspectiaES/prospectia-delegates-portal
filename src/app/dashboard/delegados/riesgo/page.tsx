import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, isKolUser } from "@/lib/profile";
import { InformeRiesgoClient, type DelegateRiesgo, type InvRiesgo } from "./InformeRiesgoClient";

type InvRow = {
  id: string;
  doc_number: string | null;
  contact_id: string | null;
  contact_name: string | null;
  date: string | null;
  due_date: string | null;
  total: number;
  status: number;
  raw: Record<string, unknown> | null;
};

function outstanding(inv: InvRow): number {
  const pp = inv.raw?.paymentsPending;
  if (typeof pp === "number" && pp > 0.02) return pp;
  return inv.total;
}

export default async function InformeRiesgoGlobalPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const isOwner = ["OWNER", "ADMIN"].includes(profile.role);
  const isKol   = isKolUser(profile);
  const admin   = createAdminClient();

  // All delegates visible to this user
  const { data: delegatesData } = await admin
    .from("profiles")
    .select("id, full_name, delegate_name, is_private, kol_id, coordinator_id")
    .or("role.eq.DELEGATE,show_in_delegate_list.eq.true")
    .order("full_name");

  const allDelegates = (delegatesData ?? []) as {
    id: string; full_name: string; delegate_name: string | null;
    is_private: boolean; kol_id: string | null; coordinator_id: string | null;
  }[];

  // Filter by visibility
  const delegates = isOwner
    ? allDelegates
    : allDelegates.filter(d => {
        if (d.is_private) return false;
        if (isKol && d.kol_id === profile.id) return true;
        if (d.id === profile.id) return true;
        return false;
      });

  const delegateIds = delegates.map(d => d.id);
  if (delegateIds.length === 0) redirect("/dashboard/delegados");

  // Contact → delegate map
  const { data: cdRows } = await admin
    .from("contact_delegates")
    .select("delegate_id, contact_id")
    .in("delegate_id", delegateIds);

  const cd = cdRows ?? [];
  const contactToDelegate: Record<string, string> = {};
  for (const row of cd) {
    if (row.contact_id && row.delegate_id) contactToDelegate[row.contact_id] = row.delegate_id;
  }

  const allContactIds = [...new Set(cd.map(r => r.contact_id).filter(Boolean) as string[])];

  const [invoicesRes, syncRes] = await Promise.all([
    allContactIds.length > 0
      ? admin.from("holded_invoices")
          .select("id, doc_number, contact_id, contact_name, date, due_date, total, status, raw")
          .in("contact_id", allContactIds)
          .in("status", [1, 2])
          .eq("is_credit_note", false)
          .order("due_date", { ascending: true })
      : Promise.resolve({ data: [] }),
    admin.from("holded_sync_log")
      .select("finished_at")
      .eq("status", "completed")
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const invoices = (invoicesRes.data ?? []) as InvRow[];
  const lastSyncAt = (syncRes.data as { finished_at: string | null } | null)?.finished_at ?? null;

  // Credit notes to exclude
  const { data: cnRows } = allContactIds.length > 0
    ? await admin.from("holded_invoices")
        .select("from_invoice_id")
        .in("contact_id", allContactIds)
        .eq("is_credit_note", true)
        .not("from_invoice_id", "is", null)
    : { data: [] };

  const cancelledIds = new Set(
    ((cnRows ?? []) as { from_invoice_id: string | null }[])
      .map(r => r.from_invoice_id).filter(Boolean) as string[]
  );

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Group by delegate
  const delegateMap: Record<string, { vencidas: InvRiesgo[]; pendientes: InvRiesgo[] }> = {};
  for (const del of delegates) delegateMap[del.id] = { vencidas: [], pendientes: [] };

  for (const inv of invoices) {
    if (cancelledIds.has(inv.id)) continue;
    if (!inv.contact_id) continue;
    const delId = contactToDelegate[inv.contact_id];
    if (!delId || !delegateMap[delId]) continue;

    const outs = outstanding(inv);
    const base: InvRiesgo = {
      id: inv.id,
      docNumber: inv.doc_number ?? inv.id.slice(0, 8),
      contactId: inv.contact_id,
      contactName: inv.contact_name ?? "—",
      total: inv.total,
      outstanding: outs,
      dueDate: inv.due_date,
    };

    if (inv.status === 2) {
      delegateMap[delId].vencidas.push({
        ...base,
        daysOverdue: inv.due_date
          ? Math.max(0, Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / 86_400_000))
          : 0,
      });
    } else {
      delegateMap[delId].pendientes.push({
        ...base,
        daysUntilDue: inv.due_date
          ? Math.floor((new Date(inv.due_date).getTime() - now.getTime()) / 86_400_000)
          : undefined,
      });
    }
  }

  // Sort vencidas by days overdue desc, pendientes by days until due asc
  for (const delId of Object.keys(delegateMap)) {
    delegateMap[delId].vencidas.sort((a, b) => (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0));
    delegateMap[delId].pendientes.sort((a, b) => {
      if (a.daysUntilDue == null) return 1;
      if (b.daysUntilDue == null) return -1;
      return a.daysUntilDue - b.daysUntilDue;
    });
  }

  // Build output — only delegates with risk (keep order for filter dropdown)
  const result: DelegateRiesgo[] = delegates
    .filter(d => delegateMap[d.id].vencidas.length > 0 || delegateMap[d.id].pendientes.length > 0)
    .map(d => ({
      id: d.id,
      name: d.delegate_name ?? d.full_name,
      ...delegateMap[d.id],
    }));

  return (
    <InformeRiesgoClient
      delegates={result}
      lastSyncAt={lastSyncAt}
      isOwner={isOwner}
    />
  );
}
