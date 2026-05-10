"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  buildAnalisiPersonaPrompt,
  buildSnapshotPrompt,
  type AnalisiPersonaResult,
  type SnapshotResult,
} from "@/lib/ecosistema-prompts";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Categoria = "nucli" | "estrategic" | "expansio" | "drenant" | "familia";

export interface Persona {
  id: string;
  user_id: string;
  nom: string;
  rol_vital: string | null;
  rol_vital_codi: string | null;
  categoria: Categoria;
  subcategoria_familiar: string | null;
  // Perception dimensions (1–5)
  energia: number | null;
  claredat: number | null;
  autenticitat: number | null;
  alineacio: number | null;
  profunditat: number | null;
  confianca: number | null;
  // Behavioral profiling
  perfil_conductual: string[];
  intensitat_perfil: Record<string, number>;
  // Risk & stability KPIs (0–10)
  risc_emocional: number | null;
  risc_professional: number | null;
  estabilitat_kpi: number | null;
  fiabilitat_kpi: number | null;
  coherencia_kpi: number | null;
  reciprocitat: number | null;
  potencial_conflicte: number | null;
  desgast_energetic: number | null;
  influencia_focus: number | null;
  influencia_mental: number | null;
  // State & feeling
  estat_relacional: string | null;
  sensacio_post: string | null;
  notes: string | null;
  // AI intelligence
  estrategia_ia: string | null;
  alertes_ia: Array<{ tipus: "atencio" | "risc" | "positiu"; missatge: string }>;
  impacte_ia: string | null;
  ai_updated_at: string | null;
  // Legacy enrichment fields
  punts_positius: string | null;
  punts_negatius: string | null;
  punts_neutres: string | null;
  utilitat: string | null;
  warnings: string | null;
  // Meta
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

  return (data ?? []).map(normalizePersona);
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

  return data ? normalizePersona(data) : null;
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

  function safeText(v: FormDataEntryValue | null) {
    const s = ((v as string) || "").trim();
    return s || null;
  }

  function safeJsonArr(v: FormDataEntryValue | null): string[] {
    try { return v ? JSON.parse(v as string) : []; } catch { return []; }
  }

  function safeJsonObj(v: FormDataEntryValue | null): Record<string, number> {
    try { return v ? JSON.parse(v as string) : {}; } catch { return {}; }
  }

  const payload = {
    user_id:               profile.id,
    nom:                   formData.get("nom") as string,
    rol_vital:             safeText(formData.get("rol_vital")),
    rol_vital_codi:        safeText(formData.get("rol_vital_codi")),
    categoria:             (formData.get("categoria") as Categoria) || "nucli",
    subcategoria_familiar: safeText(formData.get("subcategoria_familiar")),
    energia:               safeInt(formData.get("energia")),
    claredat:              safeInt(formData.get("claredat")),
    autenticitat:          safeInt(formData.get("autenticitat")),
    alineacio:             safeInt(formData.get("alineacio")),
    profunditat:           safeInt(formData.get("profunditat")),
    confianca:             safeInt(formData.get("confianca")),
    perfil_conductual:     safeJsonArr(formData.get("perfil_conductual")),
    intensitat_perfil:     safeJsonObj(formData.get("intensitat_perfil")),
    risc_emocional:        safeInt(formData.get("risc_emocional")),
    risc_professional:     safeInt(formData.get("risc_professional")),
    estabilitat_kpi:       safeInt(formData.get("estabilitat_kpi")),
    fiabilitat_kpi:        safeInt(formData.get("fiabilitat_kpi")),
    coherencia_kpi:        safeInt(formData.get("coherencia_kpi")),
    reciprocitat:          safeInt(formData.get("reciprocitat")),
    potencial_conflicte:   safeInt(formData.get("potencial_conflicte")),
    desgast_energetic:     safeInt(formData.get("desgast_energetic")),
    influencia_focus:      safeInt(formData.get("influencia_focus")),
    influencia_mental:     safeInt(formData.get("influencia_mental")),
    estat_relacional:      safeText(formData.get("estat_relacional")),
    sensacio_post:         safeText(formData.get("sensacio_post")),
    notes:                 safeText(formData.get("notes")),
    avatar_emoji:          (formData.get("avatar_emoji") as string) || "👤",
    updated_at:            new Date().toISOString(),
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

// ─── AI intelligence ──────────────────────────────────────────────────────────

async function callClaude(prompt: string, maxTokens = 800): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error: ${res.status} ${err}`);
  }

  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  return data.content.find(b => b.type === "text")?.text ?? "";
}

export async function analyzePersona(personaId: string): Promise<AnalisiPersonaResult> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const supabase = await createClient();

  const [{ data: p }, { data: ints }] = await Promise.all([
    supabase.from("ecosistema_persones").select("*").eq("id", personaId).eq("user_id", profile.id).maybeSingle(),
    supabase.from("ecosistema_interaccions").select("data,qualitat,sensacio,notes").eq("persona_id", personaId).eq("user_id", profile.id).order("data", { ascending: false }).limit(8),
  ]);

  if (!p) throw new Error("Persona not found");

  const persona = normalizePersona(p);
  const prompt = buildAnalisiPersonaPrompt({
    nom: persona.nom,
    categoria: persona.categoria,
    subcategoria_familiar: persona.subcategoria_familiar,
    rol_vital: persona.rol_vital,
    perfil_conductual: persona.perfil_conductual,
    intensitat_perfil: persona.intensitat_perfil,
    energia: persona.energia,
    claredat: persona.claredat,
    autenticitat: persona.autenticitat,
    alineacio: persona.alineacio,
    profunditat: persona.profunditat,
    confianca: persona.confianca,
    risc_emocional: persona.risc_emocional,
    risc_professional: persona.risc_professional,
    estabilitat_kpi: persona.estabilitat_kpi,
    reciprocitat: persona.reciprocitat,
    desgast_energetic: persona.desgast_energetic,
    notes: persona.notes,
    darreres_interaccions: (ints ?? []) as Interaccio[],
  });

  const raw = await callClaude(prompt, 1000);

  let result: AnalisiPersonaResult;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    result = JSON.parse(jsonMatch?.[0] ?? raw);
  } catch {
    result = {
      estrategia: raw,
      alertes: [],
      impacte: "",
    };
  }

  await supabase.from("ecosistema_persones").update({
    estrategia_ia: result.estrategia,
    alertes_ia: result.alertes,
    impacte_ia: result.impacte,
    ai_updated_at: new Date().toISOString(),
  }).eq("id", personaId).eq("user_id", profile.id);

  revalidatePath(`/dashboard/diario/ecosistema/${personaId}`);
  return result;
}

// ─── Stats & snapshot ─────────────────────────────────────────────────────────

export async function getEcosistemaStats() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const supabase = await createClient();
  const { data: raw } = await supabase
    .from("ecosistema_persones")
    .select("*")
    .eq("user_id", profile.id);

  if (!raw || raw.length === 0) return { persones: [], stats: null };

  const persones = raw.map(normalizePersona);

  const byCat = (cat: Categoria) => persones.filter(x => x.categoria === cat);
  const avgNum = (arr: Array<number | null>) => {
    const vals = arr.filter((v): v is number => v != null);
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : null;
  };

  return {
    persones,
    stats: {
      total:      persones.length,
      familia:    byCat("familia").length,
      nucli:      byCat("nucli").length,
      estrategic: byCat("estrategic").length,
      expansio:   byCat("expansio").length,
      drenant:    byCat("drenant").length,
      avg_energia:  avgNum(persones.map(p => p.energia)),
      avg_claredat: avgNum(persones.map(p => p.claredat)),
      avg_confianca: avgNum(persones.map(p => p.confianca)),
      avg_alineacio: avgNum(persones.map(p => p.alineacio)),
      avg_desgast:  avgNum(persones.map(p => p.desgast_energetic)),
      avg_estabilitat: avgNum(persones.map(p => p.estabilitat_kpi)),
    },
  };
}

export async function getEcosistemaSnapshot(): Promise<SnapshotResult | null> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const supabase = await createClient();
  const { data: raw } = await supabase
    .from("ecosistema_persones")
    .select("nom,categoria,rol_vital,risc_emocional,estabilitat_kpi,desgast_energetic,perfil_conductual")
    .eq("user_id", profile.id);

  if (!raw || raw.length < 3) return null;

  const persones = raw.map(p => ({
    nom: p.nom,
    categoria: p.categoria,
    rol_vital: p.rol_vital,
    risc_emocional: p.risc_emocional,
    estabilitat_kpi: p.estabilitat_kpi,
    desgast_energetic: p.desgast_energetic,
    perfil_conductual: Array.isArray(p.perfil_conductual) ? p.perfil_conductual : [],
  }));

  const byCat = (c: string) => persones.filter(p => p.categoria === c).length;
  const prompt = buildSnapshotPrompt({
    total: persones.length,
    familia: byCat("familia"),
    nucli: byCat("nucli"),
    estrategic: byCat("estrategic"),
    expansio: byCat("expansio"),
    drenant: byCat("drenant"),
    persones,
  });

  const raw2 = await callClaude(prompt, 600);
  try {
    const jsonMatch = raw2.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch?.[0] ?? raw2) as SnapshotResult;
  } catch {
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizePersona(raw: any): Persona {
  return {
    ...raw,
    perfil_conductual: Array.isArray(raw.perfil_conductual) ? raw.perfil_conductual : [],
    intensitat_perfil: (raw.intensitat_perfil && typeof raw.intensitat_perfil === "object" && !Array.isArray(raw.intensitat_perfil))
      ? raw.intensitat_perfil : {},
    alertes_ia: Array.isArray(raw.alertes_ia) ? raw.alertes_ia : [],
  };
}
