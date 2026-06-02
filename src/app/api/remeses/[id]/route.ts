import { getProfile } from "@/lib/profile";
import { getRemesaDetall } from "@/lib/remeses/service";

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
    const detall = await getRemesaDetall(id);
    return Response.json(detall);
  } catch (e) {
    const msg = (e as Error).message;
    return Response.json({ error: msg }, { status: msg.includes("no trobada") ? 404 : 500 });
  }
}
