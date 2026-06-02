/**
 * GET /api/remeses/factures-pendents
 *
 * Returns ALL invoices eligible (or not) for a remesa:
 *   - status 1 (pendent) or 2 (vencida), not credit notes
 *   - not already in an active (non-done) remesa
 *
 * For each invoice returns:
 *   - proposed collection date (based on mandate's termes_pagament)
 *   - eligibility + reason if not eligible
 *
 * Optional: ?dataRemesa=YYYY-MM-DD to base collection date on a specific remesa date
 *   Defaults to next Monday from today.
 */

import { getProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getDataRemesa, getCobramentEstandard, getDataCobrament,
  toISODate, parseDate,
} from "@/lib/remeses/calculs";

export const runtime = "nodejs";

export interface FacturaPendent {
  id: string;
  doc_number: string | null;
  contact_id: string | null;
  contact_name: string | null;
  date: string | null;
  due_date: string | null;
  total: number;
  status: number;              // 1=pendent, 2=vencida
  iban_deutor: string | null;
  referencia_mandat: string | null;
  sequencia_adeut: string | null;
  termes_pagament: string | null;
  data_cobrament_estandard: string | null;
  data_cobrament_ampliat: string | null;
  data_cobrament_proposada: string | null;  // based on termes_pagament
  elegible: boolean;
  motiu_no_elegible: string | null;
}

export async function GET(req: Request) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") {
    return Response.json({ error: "No autoritzat" }, { status: 401 });
  }

  const url = new URL(req.url);
  const dataRemesaParam = url.searchParams.get("dataRemesa");

  const admin = createAdminClient();

  // Determine remesa date (next Monday by default)
  let dataRemesa: Date;
  if (dataRemesaParam && /^\d{4}-\d{2}-\d{2}$/.test(dataRemesaParam)) {
    dataRemesa = parseDate(dataRemesaParam);
  } else {
    // Next Monday from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const syntheticFi = new Date(today);
    syntheticFi.setDate(today.getDate() - 1); // "yesterday" as fi → next Monday = today or next Mon
    dataRemesa = getDataRemesa(syntheticFi);
  }
  const cobramentEst = getCobramentEstandard(dataRemesa);

  // Fetch ALL pending/overdue invoices
  const { data: invoices, error: invErr } = await admin
    .from("holded_invoices")
    .select("id, doc_number, contact_id, contact_name, date, due_date, total, status")
    .in("status", [1, 2])
    .eq("is_credit_note", false)
    .order("date", { ascending: true });

  if (invErr) return Response.json({ error: invErr.message }, { status: 500 });
  if (!invoices || invoices.length === 0) {
    return Response.json({ factures: [], dataRemesa: toISODate(dataRemesa), cobramentEstandard: toISODate(cobramentEst) });
  }

  // Invoices already in an active remesa
  const { data: activeLinies } = await admin
    .from("remesa_linies")
    .select("factura_id, remeses!inner(estat)")
    .in("factura_id", invoices.map((i: { id: string }) => i.id));

  type ActiveRow = { factura_id: string; remeses: { estat: string } };
  const alreadyInRemesa = new Set(
    ((activeLinies ?? []) as unknown as ActiveRow[])
      .filter((l) => !["cobrada", "retornada"].includes(l.remeses.estat))
      .map((l) => l.factura_id)
  );

  // Contacts + mandates
  const contactIds = [...new Set(
    invoices.map((i: { contact_id: string | null }) => i.contact_id).filter(Boolean) as string[]
  )];

  const [contactsRes, mandatesRes] = await Promise.all([
    contactIds.length > 0
      ? admin.from("holded_contacts").select("id, name, iban").in("id", contactIds)
      : Promise.resolve({ data: [] }),
    contactIds.length > 0
      ? admin.from("contact_mandates")
          .select("contact_id, referencia_mandat, sequencia_adeut, termes_pagament")
          .in("contact_id", contactIds)
          .eq("actiu", true)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const contactMap = new Map(
    ((contactsRes.data ?? []) as { id: string; name: string; iban: string | null }[]).map((c) => [c.id, c])
  );
  const mandateMap = new Map<string, { referencia_mandat: string; sequencia_adeut: string; termes_pagament: string }>();
  for (const m of (mandatesRes.data ?? []) as { contact_id: string; referencia_mandat: string; sequencia_adeut: string; termes_pagament: string }[]) {
    if (!mandateMap.has(m.contact_id)) mandateMap.set(m.contact_id, m);
  }

  const factures: FacturaPendent[] = invoices.map((inv: {
    id: string; doc_number: string | null; contact_id: string | null;
    contact_name: string | null; date: string | null; due_date: string | null;
    total: number; status: number;
  }) => {
    if (alreadyInRemesa.has(inv.id)) {
      return { ...inv, iban_deutor: null, referencia_mandat: null, sequencia_adeut: null, termes_pagament: null, data_cobrament_estandard: null, data_cobrament_ampliat: null, data_cobrament_proposada: null, elegible: false, motiu_no_elegible: "Ja inclosa en una remesa activa" };
    }

    const contact = inv.contact_id ? contactMap.get(inv.contact_id) : null;
    const mandat  = inv.contact_id ? mandateMap.get(inv.contact_id) : null;

    if (!contact?.iban) {
      return { ...inv, iban_deutor: null, referencia_mandat: null, sequencia_adeut: null, termes_pagament: null, data_cobrament_estandard: null, data_cobrament_ampliat: null, data_cobrament_proposada: null, elegible: false, motiu_no_elegible: "Client sense IBAN configurat" };
    }
    if (!mandat) {
      return { ...inv, iban_deutor: contact.iban, referencia_mandat: null, sequencia_adeut: null, termes_pagament: null, data_cobrament_estandard: null, data_cobrament_ampliat: null, data_cobrament_proposada: null, elegible: false, motiu_no_elegible: "Client sense mandat SEPA actiu" };
    }

    const dataEmissio = inv.date ? parseDate(inv.date.slice(0, 10)) : new Date();
    const dcEst   = getDataCobrament(dataEmissio, "estandard", cobramentEst);
    const dcAmpl  = getDataCobrament(dataEmissio, "ampliat", cobramentEst);
    const dcProp  = getDataCobrament(dataEmissio, mandat.termes_pagament as "estandard" | "ampliat", cobramentEst);

    return {
      ...inv,
      iban_deutor:              contact.iban,
      referencia_mandat:        mandat.referencia_mandat,
      sequencia_adeut:          mandat.sequencia_adeut,
      termes_pagament:          mandat.termes_pagament,
      data_cobrament_estandard: toISODate(dcEst),
      data_cobrament_ampliat:   toISODate(dcAmpl),
      data_cobrament_proposada: toISODate(dcProp),
      elegible:                 true,
      motiu_no_elegible:        null,
    };
  });

  return Response.json({
    factures,
    dataRemesa:          toISODate(dataRemesa),
    cobramentEstandard:  toISODate(cobramentEst),
  });
}
