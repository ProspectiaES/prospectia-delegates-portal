/**
 * Remeses service — all mutations log to remesa_esdeveniments atomically.
 * Uses admin client to bypass RLS on complex multi-table operations.
 * Caller must verify OWNER role before invoking any function.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getSetmanaBounds,
  getDataRemesa,
  getCobramentEstandard,
  getDataCobrament,
  toISODate,
  parseDate,
} from "./calculs";
import type {
  Remesa,
  RemesaLinia,
  RemesaLiniaEnriquida,
  RemesaEsdeveniment,
  RemesaConResum,
  RemesaDetall,
  EstatRemesa,
  TipusEsdeveniment,
  SequenciaAdeut,
  TipusVenciment,
} from "./types";
import { randomUUID } from "crypto";

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function logEsdeveniment(
  remesaId: string,
  liniaId: string | null,
  tipus: TipusEsdeveniment,
  estatAnterior: string | null,
  estatNou: string,
  metadata: Record<string, unknown> | null,
  usuariId: string
): Promise<void> {
  const admin = createAdminClient();
  await admin.rpc("log_remesa_esdeveniment", {
    p_remesa_id:      remesaId,
    p_linia_id:       liniaId,
    p_tipus:          tipus,
    p_estat_anterior: estatAnterior,
    p_estat_nou:      estatNou,
    p_metadata:       metadata,
    p_usuari_id:      usuariId,
  });
}

// ─── Read operations ──────────────────────────────────────────────────────────

export async function getRemeses(): Promise<RemesaConResum[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("remeses")
    .select(`
      id, setmana_inici, setmana_fi, data_remesa, data_cobrament_estandard,
      estat, notes, created_at, created_by,
      remesa_linies(import, tipus_venciment)
    `)
    .order("setmana_inici", { ascending: false });

  if (error) throw new Error(`getRemeses: ${error.message}`);

  return ((data ?? []) as (Remesa & { remesa_linies: { import: number; tipus_venciment: string }[] })[]).map((r) => {
    const linies = r.remesa_linies ?? [];
    const estandard = linies.filter((l) => l.tipus_venciment === "estandard");
    const ampliat   = linies.filter((l) => l.tipus_venciment === "ampliat");
    return {
      ...r,
      remesa_linies: undefined as never,
      num_linies:      linies.length,
      import_total:    linies.reduce((s, l) => s + Number(l.import), 0),
      num_estandard:   estandard.length,
      num_ampliat:     ampliat.length,
      import_estandard: estandard.reduce((s, l) => s + Number(l.import), 0),
      import_ampliat:   ampliat.reduce((s, l) => s + Number(l.import), 0),
    } as RemesaConResum;
  });
}

export async function getRemesaDetall(remesaId: string): Promise<RemesaDetall> {
  const admin = createAdminClient();

  const [remesaRes, liniesRes, esdevRes] = await Promise.all([
    admin.from("remeses")
      .select("*")
      .eq("id", remesaId)
      .maybeSingle(),

    admin.from("remesa_linies")
      .select("*")
      .eq("remesa_id", remesaId)
      .order("data_cobrament")
      .order("tipus_venciment"),

    admin.from("remesa_esdeveniments")
      .select("*")
      .eq("remesa_id", remesaId)
      .order("created_at", { ascending: false }),
  ]);

  if (remesaRes.error) throw new Error(remesaRes.error.message);
  if (!remesaRes.data)  throw new Error("Remesa no trobada");

  const liniesBase = (liniesRes.data ?? []) as RemesaLinia[];

  // Enrich with contact name + invoice details
  const contactIds = [...new Set(liniesBase.map((l) => l.contact_id))];
  const facturaIds = [...new Set(liniesBase.map((l) => l.factura_id))];

  const [contactsRes, facturasRes] = await Promise.all([
    contactIds.length > 0
      ? admin.from("holded_contacts").select("id, name").in("id", contactIds)
      : Promise.resolve({ data: [], error: null }),
    facturaIds.length > 0
      ? admin.from("holded_invoices").select("id, doc_number, date, total").in("id", facturaIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const contactMap = new Map((contactsRes.data ?? []).map((c: { id: string; name: string }) => [c.id, c.name]));
  const facturasMap = new Map(
    (facturasRes.data ?? []).map((f: { id: string; doc_number: string | null; date: string | null; total: number }) => [
      f.id,
      { doc_number: f.doc_number, date: f.date, total: f.total },
    ])
  );

  const linies: RemesaLiniaEnriquida[] = liniesBase.map((l) => ({
    ...l,
    contact_name:  contactMap.get(l.contact_id) ?? l.contact_id,
    doc_number:    facturasMap.get(l.factura_id)?.doc_number ?? null,
    invoice_date:  facturasMap.get(l.factura_id)?.date ?? null,
    invoice_total: facturasMap.get(l.factura_id)?.total ?? l.import,
  }));

  const remesa = remesaRes.data as Remesa;
  return {
    ...remesa,
    linies,
    esdeveniments: (esdevRes.data ?? []) as RemesaEsdeveniment[],
    num_linies:    linies.length,
    import_total:  linies.reduce((s, l) => s + l.import, 0),
  };
}

// ─── generarRemesa ────────────────────────────────────────────────────────────

export async function generarRemesa(
  setmanaInici: Date,
  userId: string,
  facturaIdsSeleccionades?: string[]   // if provided, only include these invoices
): Promise<Remesa> {
  const admin = createAdminClient();

  const { inici, fi } = getSetmanaBounds(setmanaInici);
  const dataRemesa     = getDataRemesa(fi);
  const cobramentEst   = getCobramentEstandard(dataRemesa);

  const setmanaIniciStr = toISODate(inici);
  const setmanaFiStr    = toISODate(fi);

  // Guard: no active remesa for the same week
  const { data: existing } = await admin
    .from("remeses")
    .select("id, estat")
    .eq("setmana_inici", setmanaIniciStr)
    .not("estat", "in", '("cobrada","retornada")')
    .maybeSingle();

  if (existing) {
    throw new Error(
      `Ja existeix una remesa activa per la setmana del ${setmanaIniciStr} (estat: ${existing.estat})`
    );
  }

  // Find invoices for the week: status 1 (pendent) or 2 (vencida), not credit notes
  const periodStart = `${setmanaIniciStr}T00:00:00.000Z`;
  const periodEnd   = `${setmanaFiStr}T23:59:59.999Z`;

  let invQuery = admin
    .from("holded_invoices")
    .select("id, doc_number, contact_id, date, total, due_date")
    .in("status", [1, 2])
    .eq("is_credit_note", false)
    .gte("date", periodStart)
    .lte("date", periodEnd);

  if (facturaIdsSeleccionades && facturaIdsSeleccionades.length > 0) {
    invQuery = invQuery.in("id", facturaIdsSeleccionades);
  }

  const { data: invoices, error: invErr } = await invQuery;

  if (invErr) throw new Error(`Invoices query: ${invErr.message}`);
  if (!invoices || invoices.length === 0) {
    throw new Error("No hi ha factures seleccionades vàlides per a la setmana.");
  }

  // Exclude invoices already in an active remesa
  const { data: activeLinies } = await admin
    .from("remesa_linies")
    .select("factura_id, remeses!inner(estat)")
    .in(
      "factura_id",
      invoices.map((i: { id: string }) => i.id)
    );

  type ActiveLiniaRow = { factura_id: string; remeses: { estat: string } };
  const alreadyInRemesa = new Set(
    ((activeLinies ?? []) as unknown as ActiveLiniaRow[])
      .filter((l) => !["cobrada", "retornada"].includes(l.remeses.estat))
      .map((l) => l.factura_id)
  );

  const elegibles = invoices.filter(
    (inv: { id: string }) => !alreadyInRemesa.has(inv.id)
  ) as {
    id: string;
    doc_number: string | null;
    contact_id: string | null;
    date: string | null;
    total: number;
  }[];

  if (elegibles.length === 0) {
    throw new Error("Totes les factures de la setmana ja estan incloses en una remesa activa.");
  }

  // Fetch contacts with IBAN
  const contactIds = [...new Set(elegibles.map((i) => i.contact_id).filter(Boolean) as string[])];
  const { data: contacts } = await admin
    .from("holded_contacts")
    .select("id, name, iban")
    .in("id", contactIds);

  const contactMap = new Map(
    ((contacts ?? []) as { id: string; name: string; iban: string | null }[])
      .filter((c) => c.iban)
      .map((c) => [c.id, c])
  );

  // Fetch active mandates for those contacts
  const contactsWithIban = [...contactMap.keys()];
  const { data: mandates } = await admin
    .from("contact_mandates")
    .select("*")
    .in("contact_id", contactsWithIban)
    .eq("actiu", true)
    .order("created_at", { ascending: false });

  // One active mandate per contact (most recent)
  const mandateMap = new Map<
    string,
    {
      referencia_mandat: string;
      data_firma_mandat: string;
      sequencia_adeut: SequenciaAdeut;
      termes_pagament: TipusVenciment;
    }
  >();
  for (const m of (mandates ?? []) as {
    contact_id: string;
    referencia_mandat: string;
    data_firma_mandat: string;
    sequencia_adeut: SequenciaAdeut;
    termes_pagament: TipusVenciment;
  }[]) {
    if (!mandateMap.has(m.contact_id)) {
      mandateMap.set(m.contact_id, m);
    }
  }

  // Build lines only for contacts with IBAN + mandate
  const liniesData: {
    id: string;
    remesa_id: string;
    factura_id: string;
    contact_id: string;
    import: number;
    tipus_venciment: TipusVenciment;
    data_cobrament: string;
    iban_deutor: string;
    referencia_mandat: string;
    data_firma_mandat: string;
    sequencia_adeut: SequenciaAdeut;
    referencia_adeut: string;
    concepte: string | null;
  }[] = [];

  const remesaId = randomUUID();

  for (const inv of elegibles) {
    if (!inv.contact_id) continue;
    const contact = contactMap.get(inv.contact_id);
    const mandat  = mandateMap.get(inv.contact_id);
    if (!contact?.iban || !mandat) continue;

    const dataEmissio   = inv.date ? parseDate(inv.date.slice(0, 10)) : new Date();
    const tipus         = mandat.termes_pagament;
    const dataCobrament = getDataCobrament(dataEmissio, tipus, cobramentEst);

    const liniaId         = randomUUID();
    const docNum          = inv.doc_number ?? inv.id.slice(0, 20);
    const referenciaAdeut = `${docNum}-${liniaId.slice(0, 8)}`.slice(0, 35);

    liniesData.push({
      id:                liniaId,
      remesa_id:         remesaId,
      factura_id:        inv.id,
      contact_id:        inv.contact_id,
      import:            Number(inv.total),
      tipus_venciment:   tipus,
      data_cobrament:    toISODate(dataCobrament),
      iban_deutor:       contact.iban!,
      referencia_mandat: mandat.referencia_mandat,
      data_firma_mandat: mandat.data_firma_mandat,
      sequencia_adeut:   mandat.sequencia_adeut,
      referencia_adeut:  referenciaAdeut,
      concepte:          inv.doc_number,
    });
  }

  if (liniesData.length === 0) {
    throw new Error(
      "Cap factura de la setmana té client amb IBAN i mandat actiu configurat."
    );
  }

  // Insert remesa
  const { data: remesaData, error: remesaErr } = await admin
    .from("remeses")
    .insert({
      id:                       remesaId,
      setmana_inici:            setmanaIniciStr,
      setmana_fi:               setmanaFiStr,
      data_remesa:              toISODate(dataRemesa),
      data_cobrament_estandard: toISODate(cobramentEst),
      estat:                    "generada" as EstatRemesa,
      created_by:               userId,
    })
    .select()
    .single();

  if (remesaErr) throw new Error(`Inserint remesa: ${remesaErr.message}`);

  // Insert lines
  const { error: liniesErr } = await admin
    .from("remesa_linies")
    .insert(liniesData);

  if (liniesErr) throw new Error(`Inserint línies: ${liniesErr.message}`);

  // Log event
  await logEsdeveniment(
    remesaId,
    null,
    "remesa_creada",
    null,
    "generada",
    {
      num_linies:   liniesData.length,
      import_total: liniesData.reduce((s, l) => s + l.import, 0),
      setmana_inici: setmanaIniciStr,
      setmana_fi:    setmanaFiStr,
    },
    userId
  );

  return remesaData as Remesa;
}

// ─── registrarDescarregaFitxer ─────────────────────────────────────────────

export async function registrarDescarregaFitxer(
  remesaId: string,
  userId: string,
  dataCobrament: string,
  numLinies: number
): Promise<void> {
  await logEsdeveniment(
    remesaId,
    null,
    "fitxer_descarregat",
    null,
    "fitxer_descarregat",
    { data_cobrament: dataCobrament, num_linies: numLinies },
    userId
  );
}

// ─── marcarTransmesa ───────────────────────────────────────────────────────

export async function marcarTransmesa(
  remesaId: string,
  userId: string
): Promise<void> {
  const admin = createAdminClient();

  const { data: remesa } = await admin
    .from("remeses")
    .select("estat, remesa_linies(import)")
    .eq("id", remesaId)
    .maybeSingle();

  if (!remesa) throw new Error("Remesa no trobada");
  if (!["generada", "esborrany"].includes(remesa.estat)) {
    throw new Error(`No es pot marcar com a transmesa (estat actual: ${remesa.estat})`);
  }

  const { error } = await admin
    .from("remeses")
    .update({ estat: "transmesa" })
    .eq("id", remesaId);

  if (error) throw new Error(error.message);

  const linies = (remesa.remesa_linies ?? []) as { import: number }[];
  await logEsdeveniment(
    remesaId,
    null,
    "remesa_transmesa",
    remesa.estat,
    "transmesa",
    {
      usuari:       userId,
      num_linies:   linies.length,
      import_total: linies.reduce((s, l) => s + Number(l.import), 0),
    },
    userId
  );
}

// ─── marcarCobrada ─────────────────────────────────────────────────────────

export async function marcarCobrada(
  remesaId: string,
  userId: string
): Promise<void> {
  const admin = createAdminClient();

  const { data: remesa } = await admin
    .from("remeses")
    .select("estat")
    .eq("id", remesaId)
    .maybeSingle();

  if (!remesa) throw new Error("Remesa no trobada");
  if (remesa.estat !== "transmesa") {
    throw new Error(`Només es pot cobrar una remesa transmesa (estat: ${remesa.estat})`);
  }

  const { data: linies, error: liniesErr } = await admin
    .from("remesa_linies")
    .select("id, factura_id, import, data_cobrament")
    .eq("remesa_id", remesaId)
    .eq("estat_linia", "pendent");

  if (liniesErr) throw new Error(liniesErr.message);

  // Update remesa
  await admin.from("remeses").update({ estat: "cobrada" }).eq("id", remesaId);

  // Update all pending lines
  await admin
    .from("remesa_linies")
    .update({ estat_linia: "cobrada" })
    .eq("remesa_id", remesaId)
    .eq("estat_linia", "pendent");

  // Update holded_invoices to status 3 (cobrada) for included invoices
  const facturaIds = (linies ?? []).map((l: { factura_id: string }) => l.factura_id);
  if (facturaIds.length > 0) {
    await admin
      .from("holded_invoices")
      .update({ status: 3, date_paid: new Date().toISOString() })
      .in("id", facturaIds);
  }

  // Log remesa_cobrada + one linia_cobrada per line
  await logEsdeveniment(
    remesaId, null, "remesa_cobrada", "transmesa", "cobrada",
    { num_linies: (linies ?? []).length }, userId
  );

  for (const linia of (linies ?? []) as { id: string; import: number; data_cobrament: string }[]) {
    await logEsdeveniment(
      remesaId, linia.id, "linia_cobrada", "pendent", "cobrada",
      { import: linia.import, data_cobrament: linia.data_cobrament }, userId
    );
  }
}

// ─── marcarRetornada ───────────────────────────────────────────────────────

export async function marcarRetornada(
  remesaId: string,
  userId: string,
  liniaIds?: string[],
  motiu?: string
): Promise<void> {
  const admin = createAdminClient();

  const { data: remesa } = await admin
    .from("remeses")
    .select("estat")
    .eq("id", remesaId)
    .maybeSingle();

  if (!remesa) throw new Error("Remesa no trobada");
  if (remesa.estat !== "transmesa") {
    throw new Error(`Només es pot retornar una remesa transmesa (estat: ${remesa.estat})`);
  }

  if (liniaIds && liniaIds.length > 0) {
    // Partial return: only specific lines
    const { data: linies } = await admin
      .from("remesa_linies")
      .select("id, factura_id, import")
      .in("id", liniaIds)
      .eq("remesa_id", remesaId);

    await admin
      .from("remesa_linies")
      .update({ estat_linia: "retornada", motiu_retorn: motiu ?? null })
      .in("id", liniaIds);

    const facturaIds = (linies ?? []).map((l: { factura_id: string }) => l.factura_id);
    if (facturaIds.length > 0) {
      await admin
        .from("holded_invoices")
        .update({ status: 2 }) // back to vencida
        .in("id", facturaIds);
    }

    for (const linia of (linies ?? []) as { id: string; import: number }[]) {
      await logEsdeveniment(
        remesaId, linia.id, "linia_retornada", "pendent", "retornada",
        { motiu: motiu ?? null, import: linia.import, data_retorn: toISODate(new Date()) },
        userId
      );
    }
  } else {
    // Full remesa return
    const { data: linies } = await admin
      .from("remesa_linies")
      .select("id, factura_id, import")
      .eq("remesa_id", remesaId)
      .eq("estat_linia", "pendent");

    await admin
      .from("remeses")
      .update({ estat: "retornada" })
      .eq("id", remesaId);

    await admin
      .from("remesa_linies")
      .update({ estat_linia: "retornada", motiu_retorn: motiu ?? null })
      .eq("remesa_id", remesaId)
      .eq("estat_linia", "pendent");

    const facturaIds = (linies ?? []).map((l: { factura_id: string }) => l.factura_id);
    if (facturaIds.length > 0) {
      await admin.from("holded_invoices").update({ status: 2 }).in("id", facturaIds);
    }

    await logEsdeveniment(
      remesaId, null, "remesa_retornada", "transmesa", "retornada",
      { motiu: motiu ?? null, num_linies: (linies ?? []).length }, userId
    );
  }
}

// ─── Traceability queries ──────────────────────────────────────────────────

export interface RemesaTraca {
  remesa_id: string;
  setmana_inici: string;
  setmana_fi: string;
  data_cobrament: string;
  import: number;
  tipus_venciment: TipusVenciment;
  estat_linia: string;
  estat_remesa: EstatRemesa;
}

export async function getRemesesByFactura(facturaId: string): Promise<RemesaTraca[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("remesa_linies")
    .select(`
      remesa_id, import, tipus_venciment, data_cobrament, estat_linia,
      remeses(setmana_inici, setmana_fi, estat)
    `)
    .eq("factura_id", facturaId);

  if (error) throw new Error(error.message);

  type TracaRow = { remesa_id: string; import: number; tipus_venciment: TipusVenciment; data_cobrament: string; estat_linia: string; remeses: { setmana_inici: string; setmana_fi: string; estat: EstatRemesa } };
  return ((data ?? []) as unknown as TracaRow[]).map((r) => ({
    remesa_id:       r.remesa_id,
    setmana_inici:   r.remeses.setmana_inici,
    setmana_fi:      r.remeses.setmana_fi,
    data_cobrament:  r.data_cobrament,
    import:          Number(r.import),
    tipus_venciment: r.tipus_venciment,
    estat_linia:     r.estat_linia,
    estat_remesa:    r.remeses.estat,
  }));
}

export async function getRemesesByClient(contactId: string): Promise<RemesaTraca[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("remesa_linies")
    .select(`
      remesa_id, import, tipus_venciment, data_cobrament, estat_linia,
      remeses(setmana_inici, setmana_fi, estat)
    `)
    .eq("contact_id", contactId)
    .order("data_cobrament", { ascending: false });

  if (error) throw new Error(error.message);

  type TracaRow = { remesa_id: string; import: number; tipus_venciment: TipusVenciment; data_cobrament: string; estat_linia: string; remeses: { setmana_inici: string; setmana_fi: string; estat: EstatRemesa } };
  return ((data ?? []) as unknown as TracaRow[]).map((r) => ({
    remesa_id:       r.remesa_id,
    setmana_inici:   r.remeses.setmana_inici,
    setmana_fi:      r.remeses.setmana_fi,
    data_cobrament:  r.data_cobrament,
    import:          Number(r.import),
    tipus_venciment: r.tipus_venciment,
    estat_linia:     r.estat_linia,
    estat_remesa:    r.remeses.estat,
  }));
}

export async function getEsdeveniments(
  remesaId: string
): Promise<RemesaEsdeveniment[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("remesa_esdeveniments")
    .select("*")
    .eq("remesa_id", remesaId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as RemesaEsdeveniment[];
}
