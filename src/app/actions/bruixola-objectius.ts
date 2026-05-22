"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function checkAccess() {
  const user = await getAuthUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "OWNER" && profile?.role !== "CONSIGLIERE") return null;
  return user;
}

export interface ObjectiuFormState {
  error?: string;
  success?: boolean;
}

export async function createObjectiu(
  _prev: ObjectiuFormState | null,
  formData: FormData
): Promise<ObjectiuFormState> {
  const user = await checkAccess();
  if (!user) return { error: "Sense permisos" };

  const titol = (formData.get("titol") as string ?? "").trim();
  if (!titol) return { error: "El títol és obligatori" };

  const tipus     = (formData.get("tipus") as string) || "anual";
  const any       = parseInt(formData.get("any") as string) || new Date().getFullYear();
  const trimestre = formData.get("trimestre") ? parseInt(formData.get("trimestre") as string) : null;
  const mes       = formData.get("mes") ? parseInt(formData.get("mes") as string) : null;
  const estat     = (formData.get("estat") as string) || "actiu";
  const prioritat = formData.get("prioritat") ? parseInt(formData.get("prioritat") as string) : null;
  const progress  = formData.get("progress") ? parseInt(formData.get("progress") as string) : 0;
  const data_objectiu    = (formData.get("data_objectiu") as string) || null;
  const metrica          = (formData.get("metrica") as string || "").trim() || null;
  const valor_objectiu   = formData.get("valor_objectiu") ? parseFloat(formData.get("valor_objectiu") as string) : null;
  const valor_actual     = formData.get("valor_actual") ? parseFloat(formData.get("valor_actual") as string) : null;
  const seguent_accio    = (formData.get("seguent_accio") as string || "").trim() || null;
  const descripcio       = (formData.get("descripcio") as string || "").trim() || null;
  const decisio_pendent  = (formData.get("decisio_pendent") as string || "").trim() || null;

  const admin = createAdminClient();
  const { error } = await admin.from("bruixola_objectius").insert({
    user_id: user.id,
    titol, tipus, any, trimestre, mes, estat, prioritat, progress,
    data_objectiu, metrica, valor_objectiu, valor_actual,
    seguent_accio, descripcio, decisio_pendent,
    created_by: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/bruixola");
  revalidatePath("/dashboard/bruixola/objectius");
  return { success: true };
}

export async function updateObjectiu(
  _prev: ObjectiuFormState | null,
  formData: FormData
): Promise<ObjectiuFormState> {
  const user = await checkAccess();
  if (!user) return { error: "Sense permisos" };

  const id = formData.get("id") as string;
  if (!id) return { error: "ID no trobat" };

  const titol = (formData.get("titol") as string ?? "").trim();
  if (!titol) return { error: "El títol és obligatori" };

  const admin = createAdminClient();
  const { error } = await admin.from("bruixola_objectius").update({
    titol,
    tipus:           (formData.get("tipus") as string) || "anual",
    any:             parseInt(formData.get("any") as string) || new Date().getFullYear(),
    trimestre:       formData.get("trimestre") ? parseInt(formData.get("trimestre") as string) : null,
    mes:             formData.get("mes") ? parseInt(formData.get("mes") as string) : null,
    estat:           (formData.get("estat") as string) || "actiu",
    prioritat:       formData.get("prioritat") ? parseInt(formData.get("prioritat") as string) : null,
    progress:        formData.get("progress") ? parseInt(formData.get("progress") as string) : 0,
    data_objectiu:   (formData.get("data_objectiu") as string) || null,
    metrica:         (formData.get("metrica") as string || "").trim() || null,
    valor_objectiu:  formData.get("valor_objectiu") ? parseFloat(formData.get("valor_objectiu") as string) : null,
    valor_actual:    formData.get("valor_actual") ? parseFloat(formData.get("valor_actual") as string) : null,
    seguent_accio:   (formData.get("seguent_accio") as string || "").trim() || null,
    descripcio:      (formData.get("descripcio") as string || "").trim() || null,
    decisio_pendent: (formData.get("decisio_pendent") as string || "").trim() || null,
    updated_at:      new Date().toISOString(),
  }).eq("id", id).eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/bruixola");
  revalidatePath("/dashboard/bruixola/objectius");
  return { success: true };
}

export async function deleteObjectiu(id: string): Promise<ObjectiuFormState> {
  const user = await checkAccess();
  if (!user) return { error: "Sense permisos" };

  const admin = createAdminClient();
  const { error } = await admin.from("bruixola_objectius").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/bruixola");
  revalidatePath("/dashboard/bruixola/objectius");
  return { success: true };
}

export async function quickUpdateProgress(id: string, progress: number, estat: string): Promise<ObjectiuFormState> {
  const user = await checkAccess();
  if (!user) return { error: "Sense permisos" };

  const admin = createAdminClient();
  const { error } = await admin.from("bruixola_objectius")
    .update({ progress, estat, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/bruixola");
  revalidatePath("/dashboard/bruixola/objectius");
  return { success: true };
}
