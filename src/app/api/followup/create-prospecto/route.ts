import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";

export async function POST(req: NextRequest) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contact_id, contact_name } = await req.json() as { contact_id: string; contact_name: string };
  if (!contact_id || !contact_name) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const admin = createAdminClient();

  // Return existing if already linked
  const { data: existing } = await admin
    .from("prospectos")
    .select("id")
    .eq("holded_contact_id", contact_id)
    .maybeSingle();
  if (existing) return NextResponse.json({ id: existing.id, existed: true });

  const { data, error } = await admin.from("prospectos").insert({
    delegate_id:       profile.id,
    name:              contact_name,
    holded_contact_id: contact_id,
    stage:             "seguimiento",
    source:            "holded",
    converted_at:      new Date().toISOString(),
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
