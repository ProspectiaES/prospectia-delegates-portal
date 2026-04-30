import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, isKolUser } from "@/lib/profile";
import { CalendarioClient, type CalActivity } from "./CalendarioClient";

export default async function CalendarioPage() {
  const profile = await getProfile();
  if (!profile) notFound();

  const isOwner = profile.role === "OWNER" || profile.role === "ADMIN";
  const isKol   = isKolUser(profile);
  const admin   = createAdminClient();

  let query = admin
    .from("prospecto_activities")
    .select(`
      id, prospecto_id, type, title, notes,
      scheduled_at, completed_at,
      reminder_sent_24h, reminder_sent_1h,
      prospectos!inner(name, delegate_id),
      profiles!prospecto_activities_delegate_id_fkey(full_name)
    `)
    .not("scheduled_at", "is", null)
    .order("scheduled_at", { ascending: true });

  if (!isOwner && !isKol) {
    query = query.eq("delegate_id", profile.id);
  }

  const { data: rows } = await query;

  const activities: CalActivity[] = (rows ?? []).map((r: Record<string, unknown>) => ({
    id:                r.id as string,
    prospecto_id:      r.prospecto_id as string,
    prospecto_name:    (r.prospectos as { name?: string } | null)?.name ?? "—",
    delegate_name:     (r.profiles as { full_name?: string } | null)?.full_name ?? null,
    type:              r.type as string,
    title:             r.title as string,
    notes:             r.notes as string | null,
    scheduled_at:      r.scheduled_at as string,
    completed_at:      r.completed_at as string | null,
    reminder_sent_24h: r.reminder_sent_24h as string | null,
    reminder_sent_1h:  r.reminder_sent_1h as string | null,
  }));

  const pending   = activities.filter(a => !a.completed_at).length;
  const overdue   = activities.filter(a => !a.completed_at && new Date(a.scheduled_at) < new Date()).length;

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Calendario de actividades</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            {pending} pendiente{pending !== 1 ? "s" : ""}
            {overdue > 0 && <span className="text-red-600 font-medium"> · {overdue} vencida{overdue !== 1 ? "s" : ""}</span>}
          </p>
        </div>
        {isOwner && (
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#F3F4F6] text-[#6B7280]">
            Recordatorios automáticos activos
          </span>
        )}
      </div>
      <CalendarioClient activities={activities} isOwner={isOwner} />
    </div>
  );
}
