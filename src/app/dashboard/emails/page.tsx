import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { EmailsDashboardClient, type EmailSendFull } from "./EmailsDashboardClient";

export default async function EmailsDashboardPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const isOwner = profile.role === "OWNER" || profile.role === "ADMIN";
  const admin   = createAdminClient();

  let query = admin
    .from("email_sends")
    .select(`
      *,
      profiles!email_sends_sender_id_fkey(full_name),
      prospectos!email_sends_prospecto_id_fkey(name, company)
    `)
    .order("created_at", { ascending: false })
    .limit(500);

  // Non-owners only see their own sent emails
  if (!isOwner) query = query.eq("sender_id", profile.id);

  const { data: rows } = await query;

  const emails: EmailSendFull[] = (rows ?? []).map((e: Record<string, unknown>) => ({
    id:               e.id as string,
    prospecto_id:     e.prospecto_id as string,
    prospecto_name:   (e.prospectos as { name?: string } | null)?.name ?? null,
    prospecto_company:(e.prospectos as { company?: string } | null)?.company ?? null,
    sender_name:      (e.profiles as { full_name?: string } | null)?.full_name ?? null,
    to_email:         e.to_email as string,
    subject:          e.subject as string,
    status:           e.status as string,
    opens:            (e.opens as number) ?? 0,
    clicks:           (e.clicks as number) ?? 0,
    sent_at:          e.sent_at as string | null,
    first_opened_at:  e.first_opened_at as string | null,
    last_opened_at:   e.last_opened_at as string | null,
    first_clicked_at: e.first_clicked_at as string | null,
    delivered_at:     e.delivered_at as string | null,
    bounced_at:       e.bounced_at as string | null,
    complained_at:    e.complained_at as string | null,
    bounce_type:      e.bounce_type as string | null,
    created_at:       e.created_at as string,
  }));

  return <EmailsDashboardClient emails={emails} />;
}
