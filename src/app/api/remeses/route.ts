import { getProfile } from "@/lib/profile";
import { getRemeses } from "@/lib/remeses/service";

export const runtime = "nodejs";

export async function GET() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") {
    return Response.json({ error: "No autoritzat" }, { status: 401 });
  }

  try {
    const remeses = await getRemeses();
    return Response.json(remeses);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
