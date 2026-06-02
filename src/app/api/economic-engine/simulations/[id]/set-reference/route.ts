import { getProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") return Response.json({ error: "No autoritzat" }, { status: 401 });

  const { id } = await params;
  const admin   = createAdminClient();

  const { error } = await admin.rpc("set_performance_reference", { p_simulation_id: id });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
