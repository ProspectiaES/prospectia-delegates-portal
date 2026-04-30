import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST — any authenticated user logs an event
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });

    const body = await req.json();
    const admin = createAdminClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("x-real-ip")
      ?? null;

    await admin.from("user_activity_logs").insert({
      user_id:     user.id,
      user_name:   profile?.full_name ?? user.email ?? "Unknown",
      event_type:  body.event_type  ?? "page_view",
      path:        body.path        ?? null,
      action_name: body.action_name ?? null,
      duration_ms: body.duration_ms ?? null,
      metadata:    body.metadata    ?? {},
      ip,
      user_agent:  req.headers.get("user-agent") ?? null,
      session_id:  body.session_id  ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
