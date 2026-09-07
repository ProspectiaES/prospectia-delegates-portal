"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";

// Strict, local, OWNER-only gate — deliberately NOT requireBruixola() from
// bruixola.ts, which also admits a CONSIGLIERE. This is business data the
// owner wants restricted to themselves alone. This file never imports
// anything from bruixola.ts.
async function requireOwnerStrict() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");
  return profile;
}

function safeText(v: FormDataEntryValue | null): string | null {
  const s = ((v as string) || "").trim();
  return s || null;
}

function safeNum(v: FormDataEntryValue | null): number | null {
  if (!v || v === "") return null;
  const n = parseFloat(v as string);
  return isNaN(n) ? null : n;
}

export type TipusOrganitzacio = "prospecte" | "client" | "partner" | "proveidor" | "distribuidor" | "altre";
export type EstatOportunitat = "nou" | "contactat" | "qualificat" | "proposta" | "guanyat" | "perdut";

export interface Organitzacio {
  id: string;
  empresa_id: string | null;
  nom: string;
  tipus: TipusOrganitzacio;
  pais: string | null;
  sector: string | null;
  contacte: string | null;
  notes: string | null;
  created_at: string;
}

export interface Oportunitat {
  id: string;
  empresa_id: string | null;
  organitzacio_id: string;
  projecte_id: string | null;
  nom: string;
  estat: EstatOportunitat;
  ona: string | null;
  valor_potencial: number | null;
  proxima_accio: string | null;
  proxima_accio_data: string | null;
  notes: string | null;
  created_at: string;
  pipeline_id: string | null;
  stage_id: string | null;
  stage_entered_at: string | null;
  probabilitat: number | null;
  moneda: string | null;
  lost_reason: string | null;
  persona_id: string | null;
}

export interface NegociActionState {
  error?: string;
  success?: boolean;
  id?: string;
}

// ─── Activitat (timeline genèric) ───────────────────────────────────────────

export type EntityType = "oportunitat" | "organitzacio" | "projecte" | "producte";

export interface Activitat {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  action: string;
  detail: string | null;
  created_at: string;
}

async function logActivitat(userId: string, entityType: EntityType, entityId: string, action: string, detail?: string) {
  const admin = createAdminClient();
  await admin.from("bruixola_negoci_activitats").insert({
    user_id: userId, entity_type: entityType, entity_id: entityId, action, detail: detail ?? null,
  });
}

export async function getActivitats(entityType: EntityType, entityId: string): Promise<Activitat[]> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();
  const { data } = await admin
    .from("bruixola_negoci_activitats")
    .select("*")
    .eq("user_id", profile.id)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Activitat[];
}

// ─── Comentaris ─────────────────────────────────────────────────────────────

export interface Comentari {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  contingut: string;
  created_at: string;
}

export async function getComentaris(entityType: EntityType, entityId: string): Promise<Comentari[]> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();
  const { data } = await admin
    .from("bruixola_negoci_comentaris")
    .select("*")
    .eq("user_id", profile.id)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Comentari[];
}

export async function saveComentari(
  _prev: NegociActionState | null,
  formData: FormData
): Promise<NegociActionState> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();

  const contingut = safeText(formData.get("contingut"));
  if (!contingut) return { error: "El comentari no pot ser buit" };
  const entity_type = formData.get("entity_type") as EntityType;
  const entity_id = formData.get("entity_id") as string;

  const { error } = await admin.from("bruixola_negoci_comentaris").insert({
    user_id: profile.id, entity_type, entity_id, contingut,
  });
  if (error) return { error: error.message };

  if (entity_type === "oportunitat") revalidatePath(`/dashboard/bruixola/oportunitats/${entity_id}`);
  if (entity_type === "organitzacio") revalidatePath(`/dashboard/bruixola/organitzacions/${entity_id}`);
  return { success: true };
}

export async function deleteComentari(id: string, entityType: EntityType, entityId: string): Promise<void> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();
  await admin.from("bruixola_negoci_comentaris").delete().eq("id", id).eq("user_id", profile.id);
  if (entityType === "oportunitat") revalidatePath(`/dashboard/bruixola/oportunitats/${entityId}`);
  if (entityType === "organitzacio") revalidatePath(`/dashboard/bruixola/organitzacions/${entityId}`);
}

// ─── Pipelines ──────────────────────────────────────────────────────────────

export interface Pipeline {
  id: string;
  nom: string;
  descripcio: string | null;
  color: string | null;
  actiu: boolean;
  sort_order: number;
  created_at: string;
}

export async function getPipelines(): Promise<Pipeline[]> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();
  const { data } = await admin
    .from("bruixola_negoci_pipelines")
    .select("*")
    .eq("user_id", profile.id)
    .order("sort_order");
  return (data ?? []) as Pipeline[];
}

export async function savePipeline(
  _prev: NegociActionState | null,
  formData: FormData
): Promise<NegociActionState> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();

  const nom = safeText(formData.get("nom"));
  if (!nom) return { error: "El nom és obligatori" };

  const id = safeText(formData.get("id"));
  const payload = {
    user_id: profile.id,
    nom,
    descripcio: safeText(formData.get("descripcio")),
    color: safeText(formData.get("color")),
    sort_order: safeNum(formData.get("sort_order")) ?? 0,
  };

  let resultId = id;
  if (id) {
    const { error } = await admin.from("bruixola_negoci_pipelines").update(payload).eq("id", id).eq("user_id", profile.id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await admin.from("bruixola_negoci_pipelines").insert(payload).select("id").single();
    if (error) return { error: error.message };
    resultId = data?.id;
  }

  revalidatePath("/dashboard/bruixola/pipelines");
  return { success: true, id: resultId ?? undefined };
}

export async function deletePipeline(id: string): Promise<void> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();
  await admin.from("bruixola_negoci_pipelines").delete().eq("id", id).eq("user_id", profile.id);
  revalidatePath("/dashboard/bruixola/pipelines");
}

// ─── Stages ─────────────────────────────────────────────────────────────────

export interface Stage {
  id: string;
  pipeline_id: string;
  nom: string;
  sort_order: number;
  probabilitat: number | null;
  color: string | null;
  max_dies: number | null;
  es_guanyat: boolean;
  es_perdut: boolean;
  created_at: string;
}

export async function getStages(pipelineId?: string): Promise<Stage[]> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();
  let query = admin.from("bruixola_negoci_stages").select("*").eq("user_id", profile.id).order("sort_order");
  if (pipelineId) query = query.eq("pipeline_id", pipelineId);
  const { data } = await query;
  return (data ?? []) as Stage[];
}

export async function saveStage(
  _prev: NegociActionState | null,
  formData: FormData
): Promise<NegociActionState> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();

  const nom = safeText(formData.get("nom"));
  if (!nom) return { error: "El nom és obligatori" };
  const pipeline_id = safeText(formData.get("pipeline_id"));
  if (!pipeline_id) return { error: "Falta el pipeline" };

  const id = safeText(formData.get("id"));
  const payload = {
    user_id: profile.id,
    pipeline_id,
    nom,
    sort_order: safeNum(formData.get("sort_order")) ?? 0,
    probabilitat: safeNum(formData.get("probabilitat")),
    color: safeText(formData.get("color")),
    max_dies: safeNum(formData.get("max_dies")),
    es_guanyat: formData.get("es_guanyat") === "true",
    es_perdut: formData.get("es_perdut") === "true",
  };

  const { error } = id
    ? await admin.from("bruixola_negoci_stages").update(payload).eq("id", id).eq("user_id", profile.id)
    : await admin.from("bruixola_negoci_stages").insert(payload);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/bruixola/pipelines");
  return { success: true };
}

export async function deleteStage(id: string): Promise<void> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();
  await admin.from("bruixola_negoci_stages").delete().eq("id", id).eq("user_id", profile.id);
  revalidatePath("/dashboard/bruixola/pipelines");
}

// ─── Persones (contactes reals per organització) ───────────────────────────

export interface Persona {
  id: string;
  organitzacio_id: string;
  nom: string;
  cognoms: string | null;
  carrec: string | null;
  email: string | null;
  telefon: string | null;
  mobil: string | null;
  notes: string | null;
  created_at: string;
}

export async function getPersones(organitzacioId: string): Promise<Persona[]> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();
  const { data } = await admin
    .from("bruixola_negoci_persones")
    .select("*")
    .eq("organitzacio_id", organitzacioId)
    .eq("user_id", profile.id)
    .order("nom");
  return (data ?? []) as Persona[];
}

export async function savePersona(
  _prev: NegociActionState | null,
  formData: FormData
): Promise<NegociActionState> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();

  const nom = safeText(formData.get("nom"));
  if (!nom) return { error: "El nom és obligatori" };
  const organitzacio_id = safeText(formData.get("organitzacio_id"));
  if (!organitzacio_id) return { error: "Falta l'organització" };

  const id = safeText(formData.get("id"));
  const payload = {
    user_id: profile.id,
    organitzacio_id,
    nom,
    cognoms: safeText(formData.get("cognoms")),
    carrec: safeText(formData.get("carrec")),
    email: safeText(formData.get("email")),
    telefon: safeText(formData.get("telefon")),
    mobil: safeText(formData.get("mobil")),
    notes: safeText(formData.get("notes")),
  };

  const { error } = id
    ? await admin.from("bruixola_negoci_persones").update(payload).eq("id", id).eq("user_id", profile.id)
    : await admin.from("bruixola_negoci_persones").insert(payload);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/bruixola/organitzacions/${organitzacio_id}`);
  return { success: true };
}

export async function deletePersona(id: string, organitzacioId: string): Promise<void> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();
  await admin.from("bruixola_negoci_persones").delete().eq("id", id).eq("user_id", profile.id);
  revalidatePath(`/dashboard/bruixola/organitzacions/${organitzacioId}`);
}

// ─── Historial d'etapes ─────────────────────────────────────────────────────

export interface StageHistoryEntry {
  id: string;
  oportunitat_id: string;
  from_stage_id: string | null;
  to_stage_id: string | null;
  notes: string | null;
  created_at: string;
}

export async function getStageHistory(oportunitatId: string): Promise<StageHistoryEntry[]> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();
  const { data } = await admin
    .from("bruixola_negoci_stage_history")
    .select("*")
    .eq("oportunitat_id", oportunitatId)
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });
  return (data ?? []) as StageHistoryEntry[];
}

// ─── Organitzacions ─────────────────────────────────────────────────────────

export async function getOrganitzacions(): Promise<Organitzacio[]> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();
  const { data } = await admin
    .from("bruixola_organitzacions")
    .select("*")
    .eq("user_id", profile.id)
    .order("nom");
  return (data ?? []) as Organitzacio[];
}

export async function saveOrganitzacio(
  _prev: NegociActionState | null,
  formData: FormData
): Promise<NegociActionState> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();

  const nom = safeText(formData.get("nom"));
  if (!nom) return { error: "El nom és obligatori" };

  const id = safeText(formData.get("id"));
  const payload = {
    user_id: profile.id,
    empresa_id: safeText(formData.get("empresa_id")),
    nom,
    tipus: (formData.get("tipus") as TipusOrganitzacio) || "prospecte",
    pais: safeText(formData.get("pais")),
    sector: safeText(formData.get("sector")),
    contacte: safeText(formData.get("contacte")),
    notes: safeText(formData.get("notes")),
  };

  const { error } = id
    ? await admin.from("bruixola_organitzacions").update(payload).eq("id", id).eq("user_id", profile.id)
    : await admin.from("bruixola_organitzacions").insert(payload);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/bruixola/prospeccio");
  return { success: true };
}

export async function deleteOrganitzacio(id: string): Promise<void> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();
  await admin.from("bruixola_organitzacions").delete().eq("id", id).eq("user_id", profile.id);
  revalidatePath("/dashboard/bruixola/prospeccio");
}

// ─── Oportunitats ───────────────────────────────────────────────────────────

export async function getOportunitats(): Promise<Oportunitat[]> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();
  const { data } = await admin
    .from("bruixola_oportunitats")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });
  return (data ?? []) as Oportunitat[];
}

export async function getOportunitat(id: string): Promise<Oportunitat | null> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();
  const { data } = await admin
    .from("bruixola_oportunitats")
    .select("*")
    .eq("id", id)
    .eq("user_id", profile.id)
    .maybeSingle();
  return data as Oportunitat | null;
}

export async function saveOportunitat(
  _prev: NegociActionState | null,
  formData: FormData
): Promise<NegociActionState> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();

  const nom = safeText(formData.get("nom"));
  if (!nom) return { error: "El nom és obligatori" };

  const organitzacio_id = safeText(formData.get("organitzacio_id"));
  if (!organitzacio_id) return { error: "Cal seleccionar una organització" };

  const id = safeText(formData.get("id"));
  const newStageId = safeText(formData.get("stage_id"));

  let oldStageId: string | null = null;
  if (id) {
    const { data: existing } = await admin.from("bruixola_oportunitats").select("stage_id").eq("id", id).eq("user_id", profile.id).maybeSingle();
    oldStageId = existing?.stage_id ?? null;
  }
  const stageChanged = id ? newStageId !== oldStageId : !!newStageId;

  const payload: Record<string, unknown> = {
    user_id: profile.id,
    empresa_id: safeText(formData.get("empresa_id")),
    organitzacio_id,
    projecte_id: safeText(formData.get("projecte_id")),
    nom,
    estat: (formData.get("estat") as EstatOportunitat) || "nou",
    ona: safeText(formData.get("ona")),
    valor_potencial: safeNum(formData.get("valor_potencial")),
    proxima_accio: safeText(formData.get("proxima_accio")),
    proxima_accio_data: safeText(formData.get("proxima_accio_data")),
    notes: safeText(formData.get("notes")),
    pipeline_id: safeText(formData.get("pipeline_id")),
    stage_id: newStageId,
    probabilitat: safeNum(formData.get("probabilitat")),
    moneda: safeText(formData.get("moneda")) ?? "EUR",
    lost_reason: safeText(formData.get("lost_reason")),
    persona_id: safeText(formData.get("persona_id")),
  };
  if (stageChanged) payload.stage_entered_at = new Date().toISOString();

  let resultId = id;
  if (id) {
    const { error } = await admin.from("bruixola_oportunitats").update(payload).eq("id", id).eq("user_id", profile.id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await admin.from("bruixola_oportunitats").insert(payload).select("id").single();
    if (error) return { error: error.message };
    resultId = data?.id;
  }

  if (resultId && stageChanged && newStageId) {
    await admin.from("bruixola_negoci_stage_history").insert({
      user_id: profile.id, oportunitat_id: resultId, from_stage_id: oldStageId, to_stage_id: newStageId,
    });
    await logActivitat(profile.id, "oportunitat", resultId, id ? "canvi_etapa" : "creada", id ? undefined : `Oportunitat creada: ${nom}`);
  }

  revalidatePath("/dashboard/bruixola/prospeccio");
  if (payload.projecte_id) revalidatePath(`/dashboard/bruixola/projectes/${payload.projecte_id}`);
  if (resultId) revalidatePath(`/dashboard/bruixola/oportunitats/${resultId}`);
  return { success: true, id: resultId ?? undefined };
}

export async function deleteOportunitat(id: string): Promise<void> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();
  await admin.from("bruixola_oportunitats").delete().eq("id", id).eq("user_id", profile.id);
  revalidatePath("/dashboard/bruixola/prospeccio");
}

// ─── Productes (reutilitza bruixola_productes existent; bruixola.ts només en
// té getProductes() — save/delete no existien i van aquí, mai a bruixola.ts) ─

export async function saveProducte(
  _prev: NegociActionState | null,
  formData: FormData
): Promise<NegociActionState> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();

  const nom = safeText(formData.get("nom"));
  if (!nom) return { error: "El nom és obligatori" };
  const empresa_id = safeText(formData.get("empresa_id"));
  if (!empresa_id) return { error: "Cal seleccionar una empresa" };

  const id = safeText(formData.get("id"));
  const payload = {
    user_id: profile.id,
    empresa_id,
    nom,
    tipus: safeText(formData.get("tipus")),
    descripcio: safeText(formData.get("descripcio")),
  };

  const { error } = id
    ? await admin.from("bruixola_productes").update(payload).eq("id", id).eq("user_id", profile.id)
    : await admin.from("bruixola_productes").insert(payload);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/bruixola/empreses/${empresa_id}`);
  return { success: true };
}

export async function deleteProducte(id: string, empresaId: string): Promise<void> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();
  await admin.from("bruixola_productes").delete().eq("id", id).eq("user_id", profile.id);
  revalidatePath(`/dashboard/bruixola/empreses/${empresaId}`);
}

// ─── Projectes (Producte × Mercat) ──────────────────────────────────────────

export type EstatProjecteNegoci = "actiu" | "pausat" | "aturat" | "completat";

export interface ProjecteNegoci {
  id: string;
  producte_id: string;
  mercat: string;
  nom: string | null;
  estat: EstatProjecteNegoci;
  notes: string | null;
  created_at: string;
}

export async function getProjectesNegoci(): Promise<ProjecteNegoci[]> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();
  const { data } = await admin
    .from("bruixola_negoci_projectes")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });
  return (data ?? []) as ProjecteNegoci[];
}

export async function getProjecteNegoci(id: string): Promise<ProjecteNegoci | null> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();
  const { data } = await admin
    .from("bruixola_negoci_projectes")
    .select("*")
    .eq("id", id)
    .eq("user_id", profile.id)
    .maybeSingle();
  return data as ProjecteNegoci | null;
}

export async function saveProjecteNegoci(
  _prev: NegociActionState | null,
  formData: FormData
): Promise<NegociActionState> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();

  const mercat = safeText(formData.get("mercat"));
  if (!mercat) return { error: "El mercat és obligatori" };
  const producte_id = safeText(formData.get("producte_id"));
  if (!producte_id) return { error: "Cal seleccionar un producte" };

  const id = safeText(formData.get("id"));
  const payload = {
    user_id: profile.id,
    producte_id,
    mercat,
    nom: safeText(formData.get("nom")),
    estat: (formData.get("estat") as EstatProjecteNegoci) || "actiu",
    notes: safeText(formData.get("notes")),
  };

  let resultId = id;
  if (id) {
    const { error } = await admin.from("bruixola_negoci_projectes").update(payload).eq("id", id).eq("user_id", profile.id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await admin.from("bruixola_negoci_projectes").insert(payload).select("id").single();
    if (error) return { error: error.message };
    resultId = data?.id;
  }

  revalidatePath(`/dashboard/bruixola/productes/${producte_id}`);
  if (resultId) revalidatePath(`/dashboard/bruixola/projectes/${resultId}`);
  return { success: true, id: resultId ?? undefined };
}

export async function deleteProjecteNegoci(id: string, producteId: string): Promise<void> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();
  await admin.from("bruixola_negoci_projectes").delete().eq("id", id).eq("user_id", profile.id);
  revalidatePath(`/dashboard/bruixola/productes/${producteId}`);
}

// ─── Tasques (amb data límit) — vinculades a un projecte ───────────────────

export type TipusTasca = "trucada" | "reunio" | "email" | "tasca";

export interface Tasca {
  id: string;
  projecte_id: string;
  oportunitat_id: string | null;
  titol: string;
  descripcio: string | null;
  data_limit: string | null;
  hora: string | null;
  tipus: TipusTasca;
  completada: boolean;
  completada_at: string | null;
  created_at: string;
}

export async function getTasquesProjecte(projecteId: string): Promise<Tasca[]> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();
  const { data } = await admin
    .from("bruixola_negoci_tasques")
    .select("*")
    .eq("projecte_id", projecteId)
    .eq("user_id", profile.id)
    .order("data_limit", { ascending: true, nullsFirst: false });
  return (data ?? []) as Tasca[];
}

export async function getTasquesOportunitat(oportunitatId: string): Promise<Tasca[]> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();
  const { data } = await admin
    .from("bruixola_negoci_tasques")
    .select("*")
    .eq("oportunitat_id", oportunitatId)
    .eq("user_id", profile.id)
    .order("data_limit", { ascending: true, nullsFirst: false });
  return (data ?? []) as Tasca[];
}

// Totes les tasques pendents de l'owner, per a la vista d'agenda/calendari.
export async function getTasquesPendents(): Promise<Tasca[]> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();
  const { data } = await admin
    .from("bruixola_negoci_tasques")
    .select("*")
    .eq("user_id", profile.id)
    .eq("completada", false)
    .order("data_limit", { ascending: true, nullsFirst: false });
  return (data ?? []) as Tasca[];
}

export async function saveTasca(
  _prev: NegociActionState | null,
  formData: FormData
): Promise<NegociActionState> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();

  const titol = safeText(formData.get("titol"));
  if (!titol) return { error: "El títol és obligatori" };
  const projecte_id = safeText(formData.get("projecte_id"));
  if (!projecte_id) return { error: "Falta el projecte" };

  const id = safeText(formData.get("id"));
  const payload = {
    user_id: profile.id,
    projecte_id,
    oportunitat_id: safeText(formData.get("oportunitat_id")),
    titol,
    descripcio: safeText(formData.get("descripcio")),
    data_limit: safeText(formData.get("data_limit")),
    hora: safeText(formData.get("hora")),
    tipus: (formData.get("tipus") as TipusTasca) || "tasca",
  };

  const { error } = id
    ? await admin.from("bruixola_negoci_tasques").update(payload).eq("id", id).eq("user_id", profile.id)
    : await admin.from("bruixola_negoci_tasques").insert(payload);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/bruixola/projectes/${projecte_id}`);
  if (payload.oportunitat_id) revalidatePath(`/dashboard/bruixola/oportunitats/${payload.oportunitat_id}`);
  revalidatePath("/dashboard/bruixola/calendari");
  return { success: true };
}

export async function toggleTasca(id: string, projecteId: string, completada: boolean): Promise<void> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();
  const { data: tasca } = await admin.from("bruixola_negoci_tasques").select("titol, oportunitat_id").eq("id", id).eq("user_id", profile.id).maybeSingle();
  await admin.from("bruixola_negoci_tasques")
    .update({ completada, completada_at: completada ? new Date().toISOString() : null })
    .eq("id", id).eq("user_id", profile.id);
  if (completada && tasca) {
    await logActivitat(profile.id, "projecte", projecteId, "tasca_completada", tasca.titol);
    if (tasca.oportunitat_id) await logActivitat(profile.id, "oportunitat", tasca.oportunitat_id, "tasca_completada", tasca.titol);
  }
  revalidatePath(`/dashboard/bruixola/projectes/${projecteId}`);
  revalidatePath("/dashboard/bruixola/calendari");
}

export async function deleteTasca(id: string, projecteId: string): Promise<void> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();
  await admin.from("bruixola_negoci_tasques").delete().eq("id", id).eq("user_id", profile.id);
  revalidatePath(`/dashboard/bruixola/projectes/${projecteId}`);
  revalidatePath("/dashboard/bruixola/calendari");
}
