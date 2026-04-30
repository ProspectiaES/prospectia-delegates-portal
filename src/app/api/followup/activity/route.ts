import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";

export async function POST(req: NextRequest) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prospecto_id, task } = await req.json() as { prospecto_id: string; task: string };
  if (!prospecto_id || !task) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("prospecto_activities").insert({
    prospecto_id,
    delegate_id:  profile.id,
    type:         "task",
    title:        task,
    notes:        "Acción de seguimiento de cliente dormido",
    completed_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
