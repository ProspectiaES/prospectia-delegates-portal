import { getProfile } from "@/lib/profile";
import { getEsdeveniments } from "@/lib/remeses/service";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") {
    return Response.json({ error: "No autoritzat" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const events = await getEsdeveniments(id);
    return Response.json(events);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
