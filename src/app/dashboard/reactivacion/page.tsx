import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { buildDefaultReactivationEmail } from "@/lib/reactivacion-template";
import { ReactivacionClient, type ReactivacionRow } from "./ReactivacionClient";

export default async function ReactivacionPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const isOwner = ["OWNER", "ADMIN"].includes(profile.role);
  const admin = createAdminClient();

  let query = admin
    .from("reactivation_actions")
    .select("id, client_id, entity_type, owner_id, status, dormancy_status, days_inactive_at_detection, sequence_step, email_personalizado, created_at, authorized_at")
    .in("status", ["pendiente", "autorizado"])
    .order("created_at", { ascending: false });

  if (!isOwner) query = query.eq("owner_id", profile.id);

  const { data: actionsData } = await query;
  const actions = actionsData ?? [];

  if (actions.length === 0) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Reactivación de clientes</h1>
        <p className="text-sm text-[#6B7280]">No hay acciones de reactivación pendientes en este momento.</p>
      </div>
    );
  }

  const clientIds = [...new Set(actions.map(a => a.client_id))];
  const ownerIds  = [...new Set(actions.map(a => a.owner_id).filter(Boolean) as string[])];

  const [viewRes, profilesRes] = await Promise.all([
    admin
      .from("v_clients_dormits")
      .select("entity_id, entity_type, entity_name, email, days_inactive, dormancy_status, antiguity_segment, volume_segment, lifetime_revenue")
      .in("entity_id", clientIds),
    ownerIds.length > 0
      ? admin.from("profiles").select("id, full_name, delegate_name").in("id", ownerIds)
      : Promise.resolve({ data: [] }),
  ]);

  const viewMap: Record<string, {
    entity_name: string; email: string | null; days_inactive: number | null;
    dormancy_status: string; antiguity_segment: string | null; volume_segment: string;
    lifetime_revenue: number;
  }> = {};
  for (const v of viewRes.data ?? []) viewMap[v.entity_id] = v;

  const ownerMap: Record<string, string> = {};
  for (const p of (profilesRes.data ?? []) as { id: string; full_name: string; delegate_name: string | null }[]) {
    ownerMap[p.id] = p.delegate_name ?? p.full_name;
  }

  const rows: ReactivacionRow[] = actions.map(a => {
    const v = viewMap[a.client_id];
    const delegateName = a.owner_id ? (ownerMap[a.owner_id] ?? "—") : "—";
    return {
      id: a.id,
      clientId: a.client_id,
      entityType: a.entity_type,
      clientName: v?.entity_name ?? a.client_id,
      clientEmail: v?.email ?? null,
      status: a.status,
      daysInactive: v?.days_inactive ?? a.days_inactive_at_detection,
      dormancyStatus: v?.dormancy_status ?? a.dormancy_status,
      antiguitySegment: v?.antiguity_segment ?? null,
      volumeSegment: v?.volume_segment ?? "sin_volumen",
      lifetimeRevenue: v?.lifetime_revenue ?? 0,
      delegateName,
      createdAt: a.created_at,
      authorizedAt: a.authorized_at,
      emailText: a.email_personalizado ?? buildDefaultReactivationEmail(v?.entity_name ?? a.client_id, delegateName),
    };
  }).sort((a, b) => (b.daysInactive ?? 0) - (a.daysInactive ?? 0));

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Reactivación de clientes</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          {rows.length} acci{rows.length !== 1 ? "ones" : "ón"} de reactivación
          {isOwner ? " (todos los delegados)" : " asignadas a ti"}
        </p>
      </div>
      <ReactivacionClient rows={rows} isOwner={isOwner} />
    </div>
  );
}
