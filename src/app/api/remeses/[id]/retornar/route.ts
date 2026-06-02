import { getProfile } from "@/lib/profile";
import { marcarRetornada } from "@/lib/remeses/service";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") {
    return Response.json({ error: "No autoritzat" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await req.json() as { liniaIds?: string[]; motiu?: string };
    await marcarRetornada(id, profile.id, body.liniaIds, body.motiu);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 422 });
  }
}
