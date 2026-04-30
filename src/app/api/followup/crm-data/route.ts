import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";

export async function GET(req: NextRequest) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prospectoId = req.nextUrl.searchParams.get("prospecto_id");
  if (!prospectoId) return NextResponse.json({ error: "Missing prospecto_id" }, { status: 400 });

  const admin = createAdminClient();
  const [prospectoRes, activitiesRes] = await Promise.all([
    admin.from("prospectos").select("id, name, stage").eq("id", prospectoId).single(),
    admin.from("prospecto_activities")
      .select("id, type, title, completed_at, scheduled_at")
      .eq("prospecto_id", prospectoId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return NextResponse.json({
    prospecto:  prospectoRes.data ?? null,
    activities: activitiesRes.data ?? [],
  });
}
