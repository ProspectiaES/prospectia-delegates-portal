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
    const body = await req.json() as { dataRemesa?: string; facturaIds?: string[] };
    const { dataRemesa, facturaIds } = body;

    if (!dataRemesa || !/^\d{4}-\d{2}-\d{2}$/.test(dataRemesa)) {
      return Response.json({ error: "dataRemesa requerida (YYYY-MM-DD)" }, { status: 400 });
    }
    if (!facturaIds || facturaIds.length === 0) {
      return Response.json({ error: "Cal seleccionar almenys una factura" }, { status: 400 });
    }

    const remesa = await generarRemesa(parseDate(dataRemesa), profile.id, facturaIds);
    return Response.json(remesa, { status: 201 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 422 });
  }
}
