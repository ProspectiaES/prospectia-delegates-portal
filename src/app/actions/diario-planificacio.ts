"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getPlanificacio(tipus: string, yearNum: number): Promise<unknown> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase
    .from("diario_planificacio")
    .select("contingut")
    .eq("tipus", tipus)
    .eq("year_num", yearNum)
    .eq("user_id", profile.id)
    .maybeSingle();

  return data?.contingut ?? null;
}

export async function savePlanificacio(tipus: string, yearNum: number, contingut: unknown): Promise<void> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const supabase = await createClient();

  await supabase
    .from("diario_planificacio")
    .upsert(
      { user_id: profile.id, year_num: yearNum, tipus, contingut },
      { onConflict: "user_id,year_num,tipus" }
    );

  revalidatePath(`/dashboard/diario/planificacio/${tipus}`);
  revalidatePath("/dashboard/diario/planificacio");
}

export async function getSetmana(yearNum: number, setmana: number): Promise<Record<string, unknown> | null> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase
    .from("diario_setmana")
    .select("*")
    .eq("year_num", yearNum)
    .eq("setmana", setmana)
    .eq("user_id", profile.id)
    .maybeSingle();

  return data as Record<string, unknown> | null;
}

export async function saveSetmana(formData: FormData): Promise<void> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const supabase = await createClient();

  const yearNum = parseInt(formData.get("year_num") as string, 10);
  const setmana = parseInt(formData.get("setmana") as string, 10);

  let seguiment: Record<string, boolean> = {};
  try {
    seguiment = JSON.parse((formData.get("seguiment") as string) || "{}");
  } catch { /* keep empty */ }

  const notaRaw = parseInt(formData.get("nota") as string, 10);

  const payload = {
    user_id:          profile.id,
    year_num:         yearNum,
    setmana,
    frase_set:        (formData.get("frase_set") as string) || null,
    input_miro:       (formData.get("input_miro") as string) || null,
    input_llegeixo:   (formData.get("input_llegeixo") as string) || null,
    input_escolto:    (formData.get("input_escolto") as string) || null,
    millora_pare:     (formData.get("millora_pare") as string) || null,
    millora_marit:    (formData.get("millora_marit") as string) || null,
    millora_personal: (formData.get("millora_personal") as string) || null,
    millora_caracter: (formData.get("millora_caracter") as string) || null,
    millora_feina:    (formData.get("millora_feina") as string) || null,
    habits_inclou:    (formData.get("habits_inclou") as string) || null,
    habits_exclou:    (formData.get("habits_exclou") as string) || null,
    seguiment,
    resultat:         (formData.get("resultat") as string) || null,
    nota:             isNaN(notaRaw) ? null : notaRaw,
  };

  await supabase
    .from("diario_setmana")
    .upsert(payload, { onConflict: "user_id,year_num,setmana" });

  revalidatePath(`/dashboard/diario/setmana/${yearNum}/${setmana}`);
  revalidatePath("/dashboard/diario/setmana");
}
