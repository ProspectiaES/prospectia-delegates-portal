import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";

export async function POST(req: NextRequest) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    contact_id: string;
    status:     string;
    tasks_done: string[];
    otros_done: boolean;
    otros_text: string;
    notes:      string;
  };

  const { contact_id, status, tasks_done, otros_done, otros_text, notes } = body;
  if (!contact_id) return NextResponse.json({ error: "contact_id required" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("client_followups").upsert({
    contact_id,
    delegate_id: profile.id,
    status,
    tasks_done:  tasks_done ?? [],
    otros_done:  otros_done ?? false,
    otros_text:  otros_text ?? "",
    notes:       notes      ?? "",
    updated_at:  new Date().toISOString(),
  }, { onConflict: "contact_id,delegate_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
