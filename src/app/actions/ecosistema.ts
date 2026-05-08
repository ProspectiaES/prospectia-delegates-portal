"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Categoria = "nucli" | "estrategic" | "expansio" | "drenant";

export interface Persona {
  id: string;
  user_id: string;
  nom: string;
  rol_vital: string | null;
  categoria: Categoria;
  energia: number | null;
  claredat: number | null;
  autenticitat: number | null;
  alineacio: number | null;
  profunditat: number | null;
  confianca: number | null;
  estat_relacional: string | null;
  sensacio_post: string | null;
  notes: string | null;
  avatar_emoji: string | null;
  created_at: string;
  updated_at: string;
}

export interface Interaccio {
  id: string;
  persona_id: string;
  data: string;
  qualitat: number | null;
  sensacio: string | null;
  notes: string | null;
  created_at: string;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getPersones(): Promise<Persona[]> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase
    .from("ecosistema_persones")
    .select("*")
    .eq("user_id", profile.id)
    .order("nom");

  return (data ?? []) as Persona[];
}

export async function getPersona(id: string): Promise<Persona | null> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase
    .from("ecosistema_persones")
    .select("*")
    .eq("id", id)
    .eq("user_id", profile.id)
    .maybeSingle();

  return data as Persona | null;
}

export async function getInteraccions(personaId: string): Promise<Interaccio[]> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase
    .from("ecosistema_interaccions")
    .select("*")
    .eq("persona_id", personaId)
    .eq("user_id", profile.id)
    .order("data", { ascending: false })
    .limit(20);

  return (data ?? []) as Interaccio[];
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function savePersona(formData: FormData): Promise<{ id: string }> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const supabase = await createClient();

  const id = formData.get("id") as string | null;

  function safeInt(v: FormDataEntryValue | null) {
    if (!v || v === "") return null;
    const n = parseInt(v as string, 10);
    return isNaN(n) ? null : n;
  }

  const payload = {
    user_id:          profile.id,
    nom:              formData.get("nom") as string,
    rol_vital:        (formData.get("rol_vital") as string) || null,
    categoria:        (formData.get("categoria") as Categoria) || "nucli",
    energia:          safeInt(formData.get("energia")),
    claredat:         safeInt(formData.get("claredat")),
    autenticitat:     safeInt(formData.get("autenticitat")),
    alineacio:        safeInt(formData.get("alineacio")),
    profunditat:      safeInt(formData.get("profunditat")),
    confianca:        safeInt(formData.get("confianca")),
    estat_relacional: (formData.get("estat_relacional") as string) || null,
    sensacio_post:    (formData.get("sensacio_post") as string) || null,
    notes:            (formData.get("notes") as string) || null,
    avatar_emoji:     (formData.get("avatar_emoji") as string) || "👤",
    updated_at:       new Date().toISOString(),
  };

  let resultId = id;

  if (id) {
    await supabase.from("ecosistema_persones").update(payload).eq("id", id).eq("user_id", profile.id);
  } else {
    const { data } = await supabase.from("ecosistema_persones").insert(payload).select("id").single();
    resultId = data?.id;
  }

  revalidatePath("/dashboard/diario/ecosistema");
  revalidatePath(`/dashboard/diario/ecosistema/${resultId}`);
  return { id: resultId! };
}

export async function deletePersona(id: string): Promise<void> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const supabase = await createClient();
  await supabase.from("ecosistema_persones").delete().eq("id", id).eq("user_id", profile.id);
  revalidatePath("/dashboard/diario/ecosistema");
}

export async function saveInteraccio(formData: FormData): Promise<void> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const supabase = await createClient();
  const q = formData.get("qualitat");
  await supabase.from("ecosistema_interaccions").insert({
    user_id:    profile.id,
    persona_id: formData.get("persona_id") as string,
    data:       formData.get("data") as string,
    qualitat:   q ? parseInt(q as string) : null,
    sensacio:   (formData.get("sensacio") as string) || null,
    notes:      (formData.get("notes") as string) || null,
  });

  revalidatePath(`/dashboard/diario/ecosistema/${formData.get("persona_id")}`);
}

// ─── Stats for dashboard ──────────────────────────────────────────────────────

export async function getEcosistemaStats() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const supabase = await createClient();
  const { data: persones } = await supabase
    .from("ecosistema_persones")
    .select("*")
    .eq("user_id", profile.id);

  if (!persones || persones.length === 0) {
    return { persones: [], stats: null };
  }

  const p = persones as Persona[];

  const avgStat = (field: keyof Persona) => {
    const vals = p.map(x => x[field] as number | null).filter((v): v is number => v != null);
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : null;
  };

  const byCat = (cat: Categoria) => p.filter(x => x.categoria === cat);

  return {
    persones: p,
    stats: {
      total: p.length,
      nucli: byCat("nucli").length,
      estrategic: byCat("estrategic").length,
      expansio: byCat("expansio").length,
      drenant: byCat("drenant").length,
      avg_energia: avgStat("energia"),
      avg_claredat: avgStat("claredat"),
      avg_confianca: avgStat("confianca"),
      avg_alineacio: avgStat("alineacio"),
    },
  };
}
