import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { stageCfg } from "../ProspectosClient";
import { ProspectoDetailClient, type ActivityRow, type ProspectoDetail, type EmailTemplate } from "./ProspectoDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProspectoDetailPage({ params }: PageProps) {
  const { id }  = await params;
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

  const p = raw as ProspectoDetail;
  const canEdit = true;

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

  // Fetch email templates (all users can read per RLS)
  const { data: tplRows } = await admin
    .from("email_templates")
    .select("id, name, subject, body_html, body_text")
    .order("name");

  const templates = (tplRows ?? []) as EmailTemplate[];

  const cfg = stageCfg(p.stage);

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

      <ProspectoDetailClient
        prospecto={p}
        activities={activities}
        templates={templates}
        canEdit={canEdit}
        isOwner={isOwner}
      />

    </div>
  );
}
