import { createAdminClient } from "@/lib/supabase/admin";
import { runStatusSync, logSyncStart, logSyncEnd } from "@/lib/holded/sync";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";

function hasCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** Status-only sync — cron every 4 hours or manual OWNER trigger. */
export async function GET(request: Request) {
  if (!hasCronSecret(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runSync();
}

export async function POST(request: Request) {
  if (hasCronSecret(request)) return runSync();

  // Manual trigger — OWNER only
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getProfile();
  if (profile?.role !== "OWNER") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return runSync();
}

async function runSync() {
  const db = createAdminClient();
  let logId: number | null = null;

  try {
    logId = await logSyncStart(db, "status_only");
    const counts = await runStatusSync(db);
    await logSyncEnd(db, logId, counts);
    return Response.json({ ok: true, ...counts });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (logId !== null) await logSyncEnd(db, logId, {}, message);
    console.error("[holded/sync-status]", message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
