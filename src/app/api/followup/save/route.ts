import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";

export async function POST(req: NextRequest) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    contact_id:            string;
    status:                string;
    tasks_done:            string[];
    otros_done:            boolean;
    otros_text:            string;
    notes:                 string;
    newly_completed_tasks?: string[];
    prospecto_id?:         string;
  };

  const {
    contact_id, status, tasks_done, otros_done, otros_text, notes,
    newly_completed_tasks, prospecto_id,
  } = body;

  if (!contact_id) return NextResponse.json({ error: "contact_id required" }, { status: 400 });

  const admin = createAdminClient();

  const { error: upsertErr } = await admin.from("client_followups").upsert({
    contact_id,
    delegate_id: profile.id,
    status,
    tasks_done:  tasks_done  ?? [],
    otros_done:  otros_done  ?? false,
    otros_text:  otros_text  ?? "",
    notes:       notes       ?? "",
    updated_at:  new Date().toISOString(),
  }, { onConflict: "contact_id,delegate_id" });

  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

  // Create prospecto_activities for newly-completed tasks
  if (prospecto_id && newly_completed_tasks && newly_completed_tasks.length > 0) {
    await admin.from("prospecto_activities").insert(
      newly_completed_tasks.map(task => ({
        prospecto_id,
        delegate_id:  profile.id,
        type:         "task",
        title:        task,
        notes:        "Completado desde seguimiento de cliente dormido",
        completed_at: new Date().toISOString(),
      }))
    );
  }

  return NextResponse.json({ ok: true });
}
