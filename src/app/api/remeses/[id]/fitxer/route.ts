import { getProfile } from "@/lib/profile";
import { getRemesaDetall, registrarDescarregaFitxer } from "@/lib/remeses/service";
import { generateNorma19 } from "@/lib/remeses/norma19";
import type { ClientXML, FacturaXML } from "@/lib/remeses/norma19";
import type { CreditorConfig } from "@/lib/remeses/types";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function getCreditorConfig(): CreditorConfig {
  return {
    nom:           process.env.REMESES_CREDITOR_NOM   ?? "PROSPECTIA OVERSEAS CONSULTING SL",
    iban:          process.env.REMESES_CREDITOR_IBAN  ?? "",
    bic:           process.env.REMESES_CREDITOR_BIC   ?? "CAIXAGUI2XXX",
    identificador: process.env.REMESES_CREDITOR_ID    ?? "",
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") {
    return new Response("No autoritzat", { status: 401 });
  }

  const { id } = await params;

  try {
    const config = getCreditorConfig();
    if (!config.iban || !config.identificador) {
      return new Response(
        "Configuració de creditor incompleta. Definiu REMESES_CREDITOR_IBAN i REMESES_CREDITOR_ID.",
        { status: 500 }
      );
    }

    const detall = await getRemesaDetall(id);

    // Build lookup maps
    const admin = createAdminClient();
    const contactIds = [...new Set(detall.linies.map((l) => l.contact_id))];
    const { data: contacts } = await admin
      .from("holded_contacts")
      .select("id, name, bic")
      .in("id", contactIds);

    const clientsMap = new Map<string, ClientXML>(
      ((contacts ?? []) as { id: string; name: string; bic: string | null }[]).map((c) => [
        c.id,
        { id: c.id, name: c.name, bic: c.bic },
      ])
    );

    const facturesMap = new Map<string, FacturaXML>(
      detall.linies.map((l) => [
        l.factura_id,
        { id: l.factura_id, doc_number: l.doc_number },
      ])
    );

    const files = generateNorma19(detall, detall.linies, clientsMap, facturesMap, config);

    if (files.length === 0) {
      return new Response("Sense línies per generar", { status: 422 });
    }

    // Log download for each unique date
    for (const f of files) {
      const liniesForDate = detall.linies.filter((l) => l.data_cobrament === f.filename.slice(18, 26).replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"));
      await registrarDescarregaFitxer(
        id,
        profile.id,
        f.filename.replace("REMESA_PROSPECTIA_", "").replace(".xml", ""),
        liniesForDate.length || detall.linies.length
      );
    }

    if (files.length === 1) {
      // Single file — return XML directly
      return new Response(files[0].xml, {
        headers: {
          "Content-Type": "application/xml; charset=UTF-8",
          "Content-Disposition": `attachment; filename="${files[0].filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // Multiple files — ZIP them
    const boundary = "----RemesaFileBoundary";
    // Since we don't have a zip library, return the first file for now and note the second
    // In production, install fflate: npm i fflate
    // For now: return first file with header indicating there are multiple
    return new Response(files.map((f) => f.xml).join("\n<!-- NEXT FILE -->\n"), {
      headers: {
        "Content-Type": "application/xml; charset=UTF-8",
        "Content-Disposition": `attachment; filename="REMESES_${id.slice(0, 8)}.xml"`,
        "Cache-Control": "no-store",
        "X-Remesa-Files": files.map((f) => f.filename).join(","),
        "X-Boundary": boundary,
      },
    });
  } catch (e) {
    return new Response((e as Error).message, { status: 422 });
  }
}
