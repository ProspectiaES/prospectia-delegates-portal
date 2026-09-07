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
}

export interface NegociActionState {
  error?: string;
  success?: boolean;
  id?: string;
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
  const payload = {
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
  };

  if (id) {
    const { error } = await admin.from("bruixola_oportunitats").update(payload).eq("id", id).eq("user_id", profile.id);
    if (error) return { error: error.message };
    revalidatePath("/dashboard/bruixola/prospeccio");
    if (payload.projecte_id) revalidatePath(`/dashboard/bruixola/projectes/${payload.projecte_id}`);
    return { success: true, id };
  }

  const { data, error } = await admin.from("bruixola_oportunitats").insert(payload).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/dashboard/bruixola/prospeccio");
  if (payload.projecte_id) revalidatePath(`/dashboard/bruixola/projectes/${payload.projecte_id}`);
  return { success: true, id: data?.id };
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

export interface Tasca {
  id: string;
  projecte_id: string;
  titol: string;
  descripcio: string | null;
  data_limit: string | null;
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
    titol,
    descripcio: safeText(formData.get("descripcio")),
    data_limit: safeText(formData.get("data_limit")),
  };

  const { error } = id
    ? await admin.from("bruixola_negoci_tasques").update(payload).eq("id", id).eq("user_id", profile.id)
    : await admin.from("bruixola_negoci_tasques").insert(payload);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/bruixola/projectes/${projecte_id}`);
  return { success: true };
}

export async function toggleTasca(id: string, projecteId: string, completada: boolean): Promise<void> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();
  await admin.from("bruixola_negoci_tasques")
    .update({ completada, completada_at: completada ? new Date().toISOString() : null })
    .eq("id", id).eq("user_id", profile.id);
  revalidatePath(`/dashboard/bruixola/projectes/${projecteId}`);
}

export async function deleteTasca(id: string, projecteId: string): Promise<void> {
  const profile = await requireOwnerStrict();
  const admin = createAdminClient();
  await admin.from("bruixola_negoci_tasques").delete().eq("id", id).eq("user_id", profile.id);
  revalidatePath(`/dashboard/bruixola/projectes/${projecteId}`);
}
