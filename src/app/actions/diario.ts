"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function safeInt(v: FormDataEntryValue | null): number | null {
  if (!v) return null;
  const n = parseInt(v as string, 10);
  return isNaN(n) ? null : n;
}

function safeFloat(v: FormDataEntryValue | null): number | null {
  if (!v) return null;
  const n = parseFloat(v as string);
  return isNaN(n) ? null : n;
}

function safeBool(v: FormDataEntryValue | null): boolean | null {
  if (v === null) return null;
  return v === "true" || v === "1" || v === "on";
}

export async function saveDiarioEntry(formData: FormData) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const supabase = await createClient();

  const fecha = formData.get("fecha") as string;
  if (!fecha) return;

  let objectius_dia: unknown[] = [];
  let ritual_mat: Record<string, unknown> = {};
  try {
    objectius_dia = JSON.parse((formData.get("objectius_dia") as string) || "[]");
  } catch { /* keep empty */ }
  try {
    ritual_mat = JSON.parse((formData.get("ritual_mat") as string) || "{}");
  } catch { /* keep empty */ }

  const payload = {
    user_id:              profile.id,
    fecha,
    hora_inici:           (formData.get("hora_inici") as string) || null,
    estat_anim:           safeInt(formData.get("estat_anim")),
    energia:              safeInt(formData.get("energia")),
    focus_mat:            safeInt(formData.get("focus_mat")),
    son_hores:            safeFloat(formData.get("son_hores")),
    serenitat:            safeInt(formData.get("serenitat")),
    temps:                (formData.get("temps") as string) || null,
    efemeride:            (formData.get("efemeride") as string) || null,
    nota_dia:             safeInt(formData.get("nota_dia")),
    tasca_clau:           (formData.get("tasca_clau") as string) || null,
    disciplina_compromis: (formData.get("disciplina_compromis") as string) || null,
    espai_lliure:         (formData.get("espai_lliure") as string) || null,
    reflexio_personal:    (formData.get("reflexio_personal") as string) || null,
    objectius_dia,
    ritual_mat,
    activitats:           (formData.get("activitats") as string) || null,
    examen_vespre:        (formData.get("examen_vespre") as string) || null,
    tasca_completada:     safeBool(formData.get("tasca_completada")),
    disciplina_complerta: safeBool(formData.get("disciplina_complerta")),
    criteri_mantingut:    safeBool(formData.get("criteri_mantingut")),
    resultat:             (formData.get("resultat") as string) || null,
    av_disciplina:        safeInt(formData.get("av_disciplina")),
    av_mentalitat:        safeInt(formData.get("av_mentalitat")),
    av_excelencia:        safeInt(formData.get("av_excelencia")),
    av_relacions:         safeInt(formData.get("av_relacions")),
    av_serenitat:         safeInt(formData.get("av_serenitat")),
    avui_menduc:          (formData.get("avui_menduc") as string) || null,
    running_km:           safeFloat(formData.get("running_km")),
    running_min:          safeInt(formData.get("running_min")),
    running_notes:        (formData.get("running_notes") as string) || null,
  };

  await supabase
    .from("diario_entries")
    .upsert(payload, { onConflict: "user_id,fecha" });

  revalidatePath(`/dashboard/diario/${fecha}`);
  revalidatePath("/dashboard/diario");
}

export async function getDiarioCalendar(year: number) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("diario_entries")
    .select("fecha, nota_dia")
    .gte("fecha", `${year}-01-01`)
    .lte("fecha", `${year}-12-31`)
    .order("fecha");

  return (data ?? []) as { fecha: string; nota_dia: number | null }[];
}

export async function getDiarioEntry(fecha: string) {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("diario_entries")
    .select("*")
    .eq("fecha", fecha)
    .maybeSingle();

  return data;
}
