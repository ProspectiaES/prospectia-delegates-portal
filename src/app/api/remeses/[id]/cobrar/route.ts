import { getProfile } from "@/lib/profile";
import { marcarCobrada } from "@/lib/remeses/service";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") {
    return Response.json({ error: "No autoritzat" }, { status: 401 });
  }

  const { id } = await params;
  try {
    await marcarCobrada(id, profile.id);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 422 });
  }
}
