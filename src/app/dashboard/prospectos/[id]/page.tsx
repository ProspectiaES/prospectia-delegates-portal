import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { stageCfg } from "../stages";
import { ProspectoDetailClient, type ActivityRow, type ProspectoDetail, type EmailTemplate } from "./ProspectoDetailClient";
import { EmailTrackingPanel, type EmailSendRow } from "./EmailTrackingPanel";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function ProspectoDetailPage({ params, searchParams }: PageProps) {
  const { id }  = await params;
  const { tab } = await searchParams;
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const admin   = createAdminClient();
  const isOwner = profile.role === "OWNER" || profile.role === "ADMIN";
  if (!isOwner) notFound();

  // Fetch prospecto
  const { data: raw } = await admin
    .from("prospectos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!raw) notFound();

  const p       = raw as ProspectoDetail;
  const canEdit = true;
  const activeTab = tab ?? "actividad";

  // Fetch activities
  const { data: actRows } = await admin
    .from("prospecto_activities")
    .select("*, profiles!prospecto_activities_delegate_id_fkey(full_name)")
    .eq("prospecto_id", id)
    .order("created_at", { ascending: false });

  const activities: ActivityRow[] = (actRows ?? []).map((a: Record<string, unknown>) => ({
    id:           a.id as string,
    type:         a.type as string,
    title:        a.title as string,
    notes:        a.notes as string | null,
    scheduled_at: a.scheduled_at as string | null,
    completed_at: a.completed_at as string | null,
    created_at:   a.created_at as string,
    delegate_name: (a.profiles as { full_name?: string } | null)?.full_name ?? null,
  }));

  // Fetch email sends with tracking
  const { data: emailRows } = await admin
    .from("email_sends")
    .select("*, profiles!email_sends_sender_id_fkey(full_name)")
    .eq("prospecto_id", id)
    .order("created_at", { ascending: false });

  const emailSends: EmailSendRow[] = (emailRows ?? []).map((e: Record<string, unknown>) => ({
    id:               e.id as string,
    to_email:         e.to_email as string,
    subject:          e.subject as string,
    status:           e.status as string,
    opens:            (e.opens as number) ?? 0,
    clicks:           (e.clicks as number) ?? 0,
    sent_at:          e.sent_at as string | null,
    first_opened_at:  e.first_opened_at as string | null,
    last_opened_at:   e.last_opened_at as string | null,
    first_clicked_at: e.first_clicked_at as string | null,
    last_clicked_at:  e.last_clicked_at as string | null,
    delivered_at:     e.delivered_at as string | null,
    bounced_at:       e.bounced_at as string | null,
    complained_at:    e.complained_at as string | null,
    bounce_type:      e.bounce_type as string | null,
    sender_name:      (e.profiles as { full_name?: string } | null)?.full_name ?? null,
  }));

  // Fetch email templates
  const { data: tplRows } = await admin
    .from("email_templates")
    .select("id, name, subject, body_html, body_text")
    .order("name");
  const templates = (tplRows ?? []) as EmailTemplate[];

  // Sender email from profile
  const { data: senderProfile } = await admin
    .from("profiles")
    .select("email")
    .eq("id", profile.id)
    .maybeSingle();
  const senderEmail = (senderProfile as { email?: string } | null)?.email ?? null;

  const cfg = stageCfg(p.stage);

  const TABS = [
    { key: "actividad", label: "Actividad",      count: activities.length },
    { key: "emails",    label: "Emails enviados", count: emailSends.length },
  ];

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
        <Link href="/dashboard/prospectos" className="hover:text-[#8E0E1A] transition-colors">Prospectos</Link>
        <span>/</span>
        <span className="text-[#374151] font-medium">{p.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">{p.name}</h1>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
              {cfg.label}
            </span>
            {p.holded_contact_id && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                Holded
              </span>
            )}
          </div>
          {p.company && <p className="mt-1 text-sm text-[#6B7280]">{p.company}</p>}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left — info card (always visible) */}
        <div className="lg:col-span-1">
          <ProspectoDetailClient
            prospecto={p}
            activities={activities}
            templates={templates}
            senderEmail={senderEmail}
            canEdit={canEdit}
            isOwner={isOwner}
            sidebarOnly
          />
        </div>

        {/* Right — tabbed panel */}
        <div className="lg:col-span-2 space-y-4">

          {/* Tabs */}
          <div className="flex border-b border-[#E5E7EB]">
            {TABS.map(t => (
              <Link
                key={t.key}
                href={`/dashboard/prospectos/${id}?tab=${t.key}`}
                className={[
                  "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                  activeTab === t.key
                    ? "border-[#8E0E1A] text-[#8E0E1A]"
                    : "border-transparent text-[#6B7280] hover:text-[#0A0A0A]",
                ].join(" ")}
              >
                {t.label}
                {t.count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === t.key ? "bg-[#FEF2F2] text-[#8E0E1A]" : "bg-[#F3F4F6] text-[#9CA3AF]"}`}>
                    {t.count}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "actividad" && (
            <ProspectoDetailClient
              prospecto={p}
              activities={activities}
              templates={templates}
              senderEmail={senderEmail}
              canEdit={canEdit}
              isOwner={isOwner}
              activityOnly
            />
          )}

          {activeTab === "emails" && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
              <EmailTrackingPanel emails={emailSends} />
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
