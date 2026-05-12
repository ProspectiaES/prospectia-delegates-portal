"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  buildAnalisiPersonaPrompt,
  buildSnapshotPrompt,
  buildAnalisiSistemicPrompt,
  type AnalisiPersonaResult,
  type SnapshotResult,
  type AnalisiSistemicResult,
  type LinkCtx,
  type PersonaSystemicCtx,
} from "@/lib/ecosistema-prompts";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Categoria =
  | "familia"
  | "nucli"
  | "coneguts"
  | "saludats"
  | "estrategics"
  | "estrategic"
  | "expansio"
  | "drenant"
  | "inspiradors"
  | "referents"
  | "proscrits"
  | "bloquejats";

export interface TrustProfile {
  confianca_g: number | null;           // 1-5
  suport_necessitat: string | null;     // 'molt_probable'|'probable'|'dubtós'|'poc_probable'|'improbable'
  iniciativa_relacional: string | null; // 'espontani'|'si_se_demana'|'selectiu'|'evita'|'imprevisible'
  tipus_suport: string[];               // multi: emocional, economic, logistic...
  lleialtat: number | null;             // 1-5
  consistencia: number | null;          // 1-5
  reciprocitat_q: string | null;        // qualitative
  disponibilitat: string | null;        // 'alta'|'mitjana'|'baixa'|'molt_baixa'
  fiabilitat_critica: string | null;    // 'molt_fiable'|'fiable'|'incerta'|'poc_fiable'|'no_fiable'
}

export interface Persona {
  id: string;
  user_id: string;
  nom: string;
  cognom: string | null;
  foto_url: string | null;
  tags: string[];
  rol_vital: string | null;
  rol_vital_codi: string | null;
  categoria: Categoria;
  subcategoria: string | null;
  subcategoria_familiar: string | null;
  // Referents-specific
  tipus_referent: string | null;
  font_url: string | null;
  cita_clau: string | null;
  // Perception dimensions (1–5) — not used for referents/bloquejats
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
  // Legacy
  punts_positius: string | null;
  punts_negatius: string | null;
  punts_neutres: string | null;
  utilitat: string | null;
  warnings: string | null;
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

export interface TimelineEvent {
  id: string;
  person_id: string;
  data: string;
  tipus_event: string;
  descripcio: string | null;
  impacte: string | null;
  delta_confianca: number;
  delta_proximitat: number;
  delta_forca: number;
  delta_suport: number;
  delta_reciprocitat: number;
  delta_influencia: number;
  nova_categoria: string | null;
  notes: string | null;
  resum_ia: string | null;
  created_at: string;
}

export interface AnalisiSistemic extends AnalisiSistemicResult {
  id: string;
  person_id: string;
  created_at: string;
  updated_at: string;
}

export interface EcoLink {
  id: string;
  source_person_id: string;
  target_person_id: string;
  link_type: string;
  link_strength: string | null;
  influence_type: string | null;
  notes: string | null;
  source_nom?: string;
  source_cognom?: string | null;
  target_nom?: string;
  target_cognom?: string | null;
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

export async function getTrustProfile(personId: string): Promise<TrustProfile | null> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("eco_trust_profiles")
    .select("*")
    .eq("person_id", personId)
    .maybeSingle();

  if (!data) return null;
  return {
    confianca_g: data.confianca_g,
    suport_necessitat: data.suport_necessitat,
    iniciativa_relacional: data.iniciativa_relacional,
    tipus_suport: Array.isArray(data.tipus_suport) ? data.tipus_suport : [],
    lleialtat: data.lleialtat,
    consistencia: data.consistencia,
    reciprocitat_q: data.reciprocitat_q,
    disponibilitat: data.disponibilitat,
    fiabilitat_critica: data.fiabilitat_critica,
  };
}

export async function getAllEcoLinks(): Promise<EcoLink[]> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("eco_links")
    .select("*, source:source_person_id(nom, cognom), target:target_person_id(nom, cognom)")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    id: r.id,
    source_person_id: r.source_person_id,
    target_person_id: r.target_person_id,
    link_type: r.link_type,
    link_strength: r.link_strength ?? null,
    influence_type: r.influence_type ?? null,
    notes: r.notes ?? null,
    source_nom: r.source?.nom,
    source_cognom: r.source?.cognom ?? null,
    target_nom: r.target?.nom,
    target_cognom: r.target?.cognom ?? null,
  }));
}

export async function getEcoLinks(personId: string): Promise<EcoLink[]> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("eco_links")
    .select("*, source:source_person_id(nom, cognom), target:target_person_id(nom, cognom)")
    .eq("user_id", profile.id)
    .or(`source_person_id.eq.${personId},target_person_id.eq.${personId}`)
    .order("created_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    id: r.id,
    source_person_id: r.source_person_id,
    target_person_id: r.target_person_id,
    link_type: r.link_type,
    link_strength: r.link_strength ?? null,
    influence_type: r.influence_type ?? null,
    notes: r.notes ?? null,
    source_nom: r.source?.nom,
    source_cognom: r.source?.cognom ?? null,
    target_nom: r.target?.nom,
    target_cognom: r.target?.cognom ?? null,
  }));
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
    cognom:                safeText(formData.get("cognom")),
    foto_url:              safeText(formData.get("foto_url")),
    tags:                  safeJsonArr(formData.get("tags")),
    rol_vital:             safeText(formData.get("rol_vital")),
    rol_vital_codi:        safeText(formData.get("rol_vital_codi")),
    categoria:             (formData.get("categoria") as Categoria) || "nucli",
    subcategoria:          safeText(formData.get("subcategoria")),
    subcategoria_familiar: safeText(formData.get("subcategoria_familiar")),
    tipus_referent:        safeText(formData.get("tipus_referent")),
    font_url:              safeText(formData.get("font_url")),
    cita_clau:             safeText(formData.get("cita_clau")),
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

export async function saveTrustProfile(personId: string, formData: FormData): Promise<void> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") return;

  function safeInt(v: FormDataEntryValue | null) {
    if (!v || v === "") return null;
    const n = parseInt(v as string, 10);
    return isNaN(n) ? null : n;
  }

  const supabase = await createClient();
  const tipusSuport = formData.getAll("tipus_suport") as string[];

  await supabase.from("eco_trust_profiles").upsert({
    person_id:            personId,
    user_id:              profile.id,
    confianca_g:          safeInt(formData.get("confianca_g")),
    suport_necessitat:    (formData.get("suport_necessitat") as string) || null,
    iniciativa_relacional:(formData.get("iniciativa_relacional") as string) || null,
    tipus_suport:         tipusSuport,
    lleialtat:            safeInt(formData.get("lleialtat")),
    consistencia:         safeInt(formData.get("consistencia")),
    reciprocitat_q:       (formData.get("reciprocitat_q") as string) || null,
    disponibilitat:       (formData.get("disponibilitat") as string) || null,
    fiabilitat_critica:   (formData.get("fiabilitat_critica") as string) || null,
    updated_at:           new Date().toISOString(),
  }, { onConflict: "person_id" });

  revalidatePath(`/dashboard/diario/ecosistema/${personId}`);
}

export async function saveEcoLink(formData: FormData): Promise<void> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") return;

  const supabase = await createClient();
  const id = formData.get("id") as string | null;

  const payload = {
    user_id:          profile.id,
    source_person_id: formData.get("source_person_id") as string,
    target_person_id: formData.get("target_person_id") as string,
    link_type:        (formData.get("link_type") as string) || "conegut",
    link_strength:    (formData.get("link_strength") as string) || null,
    influence_type:   (formData.get("influence_type") as string) || null,
    notes:            (formData.get("notes") as string) || null,
    updated_at:       new Date().toISOString(),
  };

  if (id) {
    await supabase.from("eco_links").update(payload).eq("id", id).eq("user_id", profile.id);
  } else {
    // Skip silently if duplicate (unique constraint on user_id + source + target + link_type)
    await supabase.from("eco_links").upsert(payload, {
      onConflict: "user_id,source_person_id,target_person_id,link_type",
      ignoreDuplicates: true,
    });
  }
  revalidatePath(`/dashboard/diario/ecosistema/${payload.source_person_id}`);
  revalidatePath(`/dashboard/diario/ecosistema/${payload.target_person_id}`);
}

export async function getTimelineEvents(personId: string): Promise<TimelineEvent[]> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("eco_timeline_events")
    .select("*")
    .eq("person_id", personId)
    .eq("user_id", profile.id)
    .order("data", { ascending: false })
    .order("created_at", { ascending: false });

  return (data ?? []).map(r => ({
    ...r,
    delta_confianca:   r.delta_confianca ?? 0,
    delta_proximitat:  r.delta_proximitat ?? 0,
    delta_forca:       r.delta_forca ?? 0,
    delta_suport:      r.delta_suport ?? 0,
    delta_reciprocitat: r.delta_reciprocitat ?? 0,
    delta_influencia:  r.delta_influencia ?? 0,
  }));
}

export async function saveTimelineEvent(formData: FormData): Promise<{ id: string }> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const supabase = await createClient();
  const personId = formData.get("person_id") as string;
  const id = formData.get("id") as string | null;

  function safeDelta(key: string): number {
    const v = formData.get(key);
    if (!v) return 0;
    const n = parseInt(v as string);
    return isNaN(n) ? 0 : Math.max(-5, Math.min(5, n));
  }

  const payload = {
    user_id:            profile.id,
    person_id:          personId,
    data:               (formData.get("data") as string) || new Date().toISOString().slice(0, 10),
    tipus_event:        formData.get("tipus_event") as string,
    descripcio:         (formData.get("descripcio") as string) || null,
    impacte:            (formData.get("impacte") as string) || null,
    delta_confianca:    safeDelta("delta_confianca"),
    delta_proximitat:   safeDelta("delta_proximitat"),
    delta_forca:        safeDelta("delta_forca"),
    delta_suport:       safeDelta("delta_suport"),
    delta_reciprocitat: safeDelta("delta_reciprocitat"),
    delta_influencia:   safeDelta("delta_influencia"),
    nova_categoria:     (formData.get("nova_categoria") as string) || null,
    notes:              (formData.get("notes") as string) || null,
    updated_at:         new Date().toISOString(),
  };

  let resultId = id;
  if (id) {
    await supabase.from("eco_timeline_events").update(payload).eq("id", id).eq("user_id", profile.id);
  } else {
    const { data: inserted } = await supabase.from("eco_timeline_events").insert(payload).select("id").single();
    resultId = inserted?.id;
  }

  revalidatePath(`/dashboard/diario/ecosistema/${personId}`);
  return { id: resultId! };
}

export async function deleteTimelineEvent(id: string, personId: string): Promise<void> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") return;
  const supabase = await createClient();
  await supabase.from("eco_timeline_events").delete().eq("id", id).eq("user_id", profile.id);
  revalidatePath(`/dashboard/diario/ecosistema/${personId}`);
}

export async function deleteEcoLink(id: string): Promise<void> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") return;
  const supabase = await createClient();
  await supabase.from("eco_links").delete().eq("id", id).eq("user_id", profile.id);
  revalidatePath("/dashboard/diario/ecosistema");
}

export async function getAnalisiSistemic(personId: string): Promise<AnalisiSistemic | null> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("eco_ia_sistemic")
    .select("*")
    .eq("person_id", personId)
    .eq("user_id", profile.id)
    .maybeSingle();
  return data as AnalisiSistemic | null;
}

export async function getAllAnalisiSistemic(): Promise<AnalisiSistemic[]> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("eco_ia_sistemic")
    .select("*")
    .eq("user_id", profile.id);
  return (data ?? []) as AnalisiSistemic[];
}

export async function analitzarPersonaSistemic(personId: string): Promise<AnalisiSistemic> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") throw new Error("No autoritzat");

  const supabase = await createClient();

  // Fetch all context in parallel
  const [persona, trustData, eventsData, linksData, allPersonesData] = await Promise.all([
    getPersona(personId),
    getTrustProfile(personId),
    getTimelineEvents(personId),
    getEcoLinks(personId),
    getPersones(),
  ]);

  if (!persona) throw new Error("Persona no trobada");

  const personMap = new Map(allPersonesData.map(p => [p.id, p]));

  const links: LinkCtx[] = linksData.map(l => {
    const isSource = l.source_person_id === personId;
    const neighborId = isSource ? l.target_person_id : l.source_person_id;
    const neighbor = personMap.get(neighborId);
    return {
      link_type: l.link_type,
      link_strength: l.link_strength,
      influence_type: l.influence_type,
      direction: isSource ? "out" : "in",
      nom: neighbor?.nom ?? (isSource ? (l.target_nom ?? "—") : (l.source_nom ?? "—")),
      cognom: neighbor?.cognom ?? null,
      categoria: neighbor?.categoria ?? "coneguts",
    };
  });

  const CRITICAL_TYPES = [
    "suport_important", "ajuda_significativa", "proteccio",
    "reconciliacio", "moment_transformador",
  ];

  const total_delta = eventsData.reduce(
    (acc, e) => ({
      confianca:    acc.confianca    + e.delta_confianca,
      proximitat:   acc.proximitat   + e.delta_proximitat,
      forca:        acc.forca        + e.delta_forca,
      suport:       acc.suport       + e.delta_suport,
      reciprocitat: acc.reciprocitat + e.delta_reciprocitat,
      influencia:   acc.influencia   + e.delta_influencia,
    }),
    { confianca: 0, proximitat: 0, forca: 0, suport: 0, reciprocitat: 0, influencia: 0 }
  );

  const sorted = [...eventsData].sort((a, b) => a.data.localeCompare(b.data));

  const ctx: PersonaSystemicCtx = {
    nom: persona.nom, cognom: persona.cognom,
    categoria: persona.categoria,
    subcategoria: persona.subcategoria ?? persona.subcategoria_familiar,
    rol_vital: persona.rol_vital, tags: persona.tags, notes: persona.notes,
    confianca: persona.confianca, reciprocitat: persona.reciprocitat,
    risc_emocional: persona.risc_emocional,
    risc_professional: persona.risc_professional,
    estabilitat_kpi: persona.estabilitat_kpi,
    desgast_energetic: persona.desgast_energetic,
    fiabilitat_critica: trustData?.fiabilitat_critica,
    suport_necessitat: trustData?.suport_necessitat,
    iniciativa_relacional: trustData?.iniciativa_relacional,
    reciprocitat_q: trustData?.reciprocitat_q,
    disponibilitat: trustData?.disponibilitat,
    confianca_g: trustData?.confianca_g,
    lleialtat: trustData?.lleialtat,
    consistencia: trustData?.consistencia,
    tipus_suport: trustData?.tipus_suport,
    links,
    neighbor_categories: [...new Set(links.map(l => l.categoria))],
    degree: links.length,
    events_count: eventsData.length,
    total_delta,
    recent_events: sorted.slice(-5).map(e => ({
      data: e.data, tipus: e.tipus_event, descripcio: e.descripcio,
      delta_confianca: e.delta_confianca, delta_proximitat: e.delta_proximitat,
      delta_forca: e.delta_forca, delta_suport: e.delta_suport,
      delta_reciprocitat: e.delta_reciprocitat, delta_influencia: e.delta_influencia,
    })),
    critical_events_present: eventsData.some(e => CRITICAL_TYPES.includes(e.tipus_event)),
  };

  const prompt = buildAnalisiSistemicPrompt(ctx);
  const raw = await callClaude(prompt, 1400);

  let result: AnalisiSistemicResult;
  try {
    const cleaned = raw.replace(/```json\n?|```/g, "").trim();
    result = JSON.parse(cleaned);
  } catch {
    throw new Error("Error parsejant resposta IA: " + raw.slice(0, 120));
  }

  const payload = {
    user_id:               profile.id,
    person_id:             personId,
    fets:                  result.fets ?? [],
    inferencies:           result.inferencies ?? [],
    nivell_confianca:      result.nivell_confianca ?? "mitja",
    que_falta:             result.que_falta ?? [],
    observacions:          result.observacions ?? [],
    tendencia:             result.tendencia ?? "sense_dades",
    figura_central:        result.figura_central ?? false,
    figura_pont:           result.figura_pont ?? false,
    xarxa_cohesionada:     result.xarxa_cohesionada ?? false,
    confianca_alta:        result.confianca_alta ?? false,
    reciprocitat_desigual: result.reciprocitat_desigual ?? false,
    present_moments_critics: result.present_moments_critics ?? false,
    updated_at:            new Date().toISOString(),
  };

  const { data: saved, error } = await supabase
    .from("eco_ia_sistemic")
    .upsert(payload, { onConflict: "user_id,person_id" })
    .select()
    .single();

  if (error) throw new Error("Error guardant anàlisi: " + error.message);

  revalidatePath(`/dashboard/diario/ecosistema/${personId}`);
  revalidatePath("/dashboard/diario/ecosistema");

  return saved as AnalisiSistemic;
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
    cognom: persona.cognom,
    categoria: persona.categoria,
    subcategoria: persona.subcategoria,
    subcategoria_familiar: persona.subcategoria_familiar,
    rol_vital: persona.rol_vital,
    tags: persona.tags,
    cita_clau: persona.cita_clau,
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
    result = { estrategia: raw, alertes: [], impacte: "" };
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
      total:       persones.length,
      familia:     byCat("familia").length,
      nucli:       byCat("nucli").length,
      coneguts:    byCat("coneguts").length,
      saludats:    byCat("saludats").length,
      estrategics: byCat("estrategics").length,
      inspiradors: byCat("inspiradors").length,
      referents:   byCat("referents").length,
      proscrits:   byCat("proscrits").length,
      bloquejats:  byCat("bloquejats").length,
      avg_energia:     avgNum(persones.map(p => p.energia)),
      avg_claredat:    avgNum(persones.map(p => p.claredat)),
      avg_confianca:   avgNum(persones.map(p => p.confianca)),
      avg_alineacio:   avgNum(persones.map(p => p.alineacio)),
      avg_desgast:     avgNum(persones.map(p => p.desgast_energetic)),
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
    .select("nom,cognom,categoria,rol_vital,risc_emocional,estabilitat_kpi,desgast_energetic,perfil_conductual,tags")
    .eq("user_id", profile.id);

  if (!raw || raw.length < 2) return null;

  const persones = raw.map(p => ({
    nom: p.nom,
    cognom: p.cognom,
    categoria: p.categoria,
    rol_vital: p.rol_vital,
    risc_emocional: p.risc_emocional,
    estabilitat_kpi: p.estabilitat_kpi,
    desgast_energetic: p.desgast_energetic,
    perfil_conductual: Array.isArray(p.perfil_conductual) ? p.perfil_conductual : [],
    tags: Array.isArray(p.tags) ? p.tags : [],
  }));

  const byCat = (c: string) => persones.filter(p => p.categoria === c).length;
  const prompt = buildSnapshotPrompt({
    total:       persones.length,
    familia:     byCat("familia"),
    nucli:       byCat("nucli"),
    coneguts:    byCat("coneguts"),
    saludats:    byCat("saludats"),
    estrategics: byCat("estrategics"),
    inspiradors: byCat("inspiradors"),
    referents:   byCat("referents"),
    proscrits:   byCat("proscrits"),
    bloquejats:  byCat("bloquejats"),
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
    cognom: raw.cognom ?? null,
    foto_url: raw.foto_url ?? null,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    subcategoria: raw.subcategoria ?? null,
    tipus_referent: raw.tipus_referent ?? null,
    font_url: raw.font_url ?? null,
    cita_clau: raw.cita_clau ?? null,
    perfil_conductual: Array.isArray(raw.perfil_conductual) ? raw.perfil_conductual : [],
    intensitat_perfil: (raw.intensitat_perfil && typeof raw.intensitat_perfil === "object" && !Array.isArray(raw.intensitat_perfil))
      ? raw.intensitat_perfil : {},
    alertes_ia: Array.isArray(raw.alertes_ia) ? raw.alertes_ia : [],
  };
}
