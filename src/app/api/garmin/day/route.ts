import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/profile";
import { fetchGarminDay } from "@/lib/garmin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const dateParam  = searchParams.get("date");
  const cronSecret = req.headers.get("x-cron-secret");
  const shouldSave = searchParams.get("save") === "true";

  // ── Auth: session (button) or cron secret (automatic) ──
  const isCron = cronSecret === process.env.CRON_SECRET && !!process.env.CRON_SECRET;
  if (!isCron) {
    const profile = await getProfile();
    if (!profile || profile.role !== "OWNER") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  // ── Date: explicit param or yesterday (for cron) ──
  const date = dateParam ?? (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }

  try {
    const data = await fetchGarminDay(date);

    // ── Upsert to DB (cron auto-sync or explicit save=true) ──
    if (isCron || shouldSave) {
      const admin = createAdminClient();
      // Get owner's user_id
      const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .eq("role", "OWNER")
        .maybeSingle();

      if (profile?.id) {
        const patch: Record<string, unknown> = { user_id: profile.id, fecha: date };
        if (data.son_hores   != null) patch.son_hores   = data.son_hores;
        if (data.energia     != null) patch.energia     = data.energia;
        if (data.serenitat   != null) patch.serenitat   = data.serenitat;
        if (data.running_km  != null) patch.running_km  = data.running_km;
        if (data.running_min != null) patch.running_min = data.running_min;

        // Only write fields that Garmin provided — don't overwrite manual edits
        if (Object.keys(patch).length > 2) {
          await admin
            .from("diario_entries")
            .upsert(patch, { onConflict: "user_id,fecha", ignoreDuplicates: false });
        }
      }
    }

    return NextResponse.json({ ok: true, date, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
