import { createAdminClient } from "@/lib/supabase/admin";
import { runFullSync, logSyncStart, logSyncEnd } from "@/lib/holded/sync";
import { createClient } from "@/lib/supabase/server";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  // Vercel Cron sends: Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  // Manual trigger from authenticated dashboard user
  return false;
}

/** Full sync — called by Vercel Cron every 15 minutes, or manually. */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runSync();
}

/** Also accept POST so an authenticated user can trigger it from the dashboard. */
export async function POST(request: Request) {
  // Check cron secret first
  if (isAuthorized(request)) return runSync();

  // Fall back to checking the user's Supabase session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  return runSync();
}

async function runSync() {
  const db = createAdminClient();
  let logId: number | null = null;

  try {
    logId = await logSyncStart(db, "full");
    const counts = await runFullSync(db);
    await logSyncEnd(db, logId, counts);
    return Response.json({ ok: true, ...counts });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (logId !== null) await logSyncEnd(db, logId, {}, message);
    console.error("[holded/sync]", message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
