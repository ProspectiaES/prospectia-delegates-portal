import { getProfile } from "@/lib/profile";
import { generarRemesa } from "@/lib/remeses/service";
import { parseDate } from "@/lib/remeses/calculs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") {
    return Response.json({ error: "No autoritzat" }, { status: 401 });
  }

  try {
    const body = await req.json() as { setmanaInici?: string; facturaIds?: string[] };
    const { setmanaInici, facturaIds } = body;
    if (!setmanaInici || !/^\d{4}-\d{2}-\d{2}$/.test(setmanaInici)) {
      return Response.json({ error: "setmanaInici requerida (YYYY-MM-DD)" }, { status: 400 });
    }

    const remesa = await generarRemesa(parseDate(setmanaInici), profile.id, facturaIds);
    return Response.json(remesa, { status: 201 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 422 });
  }
}
