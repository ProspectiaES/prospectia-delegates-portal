"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  buildActorAnalysisPrompt,
  buildActorAlertsPrompt,
  type ActorAnalysisResult,
} from "@/lib/strategic-actor-prompts";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StrategicActor {
  id: string;
  user_id: string;
  // Identitat
  nom: string;
  empresa: string | null;
  carrec: string | null;
  pais: string | null;
  idioma: string | null;
  email: string | null;
  telefon: string | null;
  canal_principal: string | null;
  origen_contacte: string | null;
  data_primer_contacte: string | null;
  data_ultim_contacte: string | null;
  font_informacio: string | null;
  // Rol
  rol_tipus: string[];
  rol_formal: string | null;
  rol_real: string | null;
  poder_decisio: number | null;
  capacitat_execucio: number | null;
  capacitat_influencia: number | null;
  acces_que_aporta: string | null;
  mercat_que_pot_obrir: string | null;
  // Rellevància
  impacte_potencial: number | null;
  impacte_actual: number | null;
  valor_estrategic: number | null;
  urgencia: number | null;
  prioritat: number | null;
  alineacio_objectius: number | null;
  capacitat_caixa: number | null;
  capacitat_portes: number | null;
  capacitat_bloqueig: number | null;
  capacitat_accelerar: number | null;
  classificacio_relevancia: string | null;
  // Conducta
  estil_comunicacio: string | null;
  estil_decisio: string | null;
  velocitat_resposta: string | null;
  tolerancia_risc: string | null;
  fiabilitat_percebuda: number | null;
  consistencia: number | null;
  orientacio_resultat: number | null;
  orientacio_relacio: number | null;
  capacitat_negociacio: number | null;
  trets_conductuals: string[];
  notes_conductuals: string | null;
  // Potencialitat
  classificacio_potencial: string | null;
  justificacio_potencial: string | null;
  potencial_ia: string | null;
  // Risc
  risc_comercial: number;
  risc_reputacional: number;
  risc_legal: number;
  risc_financer: number;
  risc_dependencia: number;
  risc_incompliment: number;
  risc_bloqueig: number;
  risc_conflicte: number;
  classificacio_risc: string | null;
  notes_risc: string | null;
  // PDI
  is_pdi: boolean;
  motiu_pdi: string | null;
  tipus_influencia_pdi: string | null;
  pdi_notes: string | null;
  // IA
  estrategia_ia: string | null;
  alertes_ia: ActorAlert[] | null;
  ai_analisi_complet: string | null;
  ai_confianca: number | null;
  ai_updated_at: string | null;
  // General
  notes: string | null;
  notes_confidencials: string | null;
  actiu: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActorAlert {
  tipus: string;
  missatge: string;
  severitat: "baixa" | "mitja" | "alta" | "critica";
  accio_recomanada: string;
}

export interface ActorInteraction {
  id: string;
  actor_id: string;
  user_id: string;
  tipus: string;
  titol: string;
  contingut: string | null;
  data: string;
  resultat: string | null;
  reaccio_observada: string | null;
  seguiment_necessari: boolean;
  data_seguiment: string | null;
  sensible: boolean;
  created_at: string;
}

export interface ActorLink {
  id: string;
  actor_id: string;
  user_id: string;
  entitat_tipus: string;
  entitat_id: string | null;
  entitat_nom: string;
  tipus_vincle: string | null;
  descripcio: string | null;
  created_at: string;
}

export interface PDIExport {
  id: string;
  actor_id: string;
  data_export: string;
  contingut_exportat: Record<string, unknown>;
  notes: string | null;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function requireOwner() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");
  return profile;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeText(v: FormDataEntryValue | null): string | null {
  const s = ((v as string) || "").trim();
  return s || null;
}
function safeDate(v: FormDataEntryValue | null): string | null {
  const s = ((v as string) || "").trim();
  return s || null;
}
function safeInt(v: FormDataEntryValue | null): number | null {
  if (!v || v === "") return null;
  const n = parseInt(v as string, 10);
  return isNaN(n) ? null : n;
}
function safeArr(v: FormDataEntryValue | null): string[] {
  try { return v ? JSON.parse(v as string) : []; } catch { return []; }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeActor(r: any): StrategicActor {
  return {
    ...r,
    rol_tipus: Array.isArray(r.rol_tipus) ? r.rol_tipus : [],
    trets_conductuals: Array.isArray(r.trets_conductuals) ? r.trets_conductuals : [],
    alertes_ia: r.alertes_ia ? (Array.isArray(r.alertes_ia) ? r.alertes_ia : []) : null,
    risc_comercial: r.risc_comercial ?? 0,
    risc_reputacional: r.risc_reputacional ?? 0,
    risc_legal: r.risc_legal ?? 0,
    risc_financer: r.risc_financer ?? 0,
    risc_dependencia: r.risc_dependencia ?? 0,
    risc_incompliment: r.risc_incompliment ?? 0,
    risc_bloqueig: r.risc_bloqueig ?? 0,
    risc_conflicte: r.risc_conflicte ?? 0,
  };
}

// ─── Claude helpers ───────────────────────────────────────────────────────────

async function callClaude(prompt: string, maxTokens = 1500): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const json = await res.json() as { content?: Array<{ type: string; text: string }> };
  return json.content?.[0]?.text ?? "";
}

// Versió amb documents adjunts (PDFs / text). Usa Sonnet per més capacitat analítica.
async function callClaudeWithDocs(
  prompt: string,
  docs: Array<{ mediaType: string; base64: string; nom: string; notes: string | null }>,
  maxTokens = 3000
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  type ContentBlock =
    | { type: "text"; text: string }
    | { type: "document"; source: { type: "base64"; media_type: string; data: string }; title?: string; context?: string }
    | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

  const content: ContentBlock[] = [];

  for (const doc of docs) {
    if (doc.mediaType === "application/pdf" || doc.mediaType.startsWith("text/")) {
      content.push({
        type: "document",
        source: { type: "base64", media_type: doc.mediaType, data: doc.base64 },
        title: doc.nom,
        ...(doc.notes ? { context: doc.notes } : {}),
      });
    }
  }

  content.push({ type: "text", text: prompt });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{ role: "user", content }],
    }),
  });
  const json = await res.json() as { content?: Array<{ type: string; text: string }> };
  return json.content?.[0]?.text ?? "";
}

// ─── Actors CRUD ──────────────────────────────────────────────────────────────

export async function getActors(filters?: {
  rol?: string; classificacio?: string; is_pdi?: boolean; search?: string;
}): Promise<StrategicActor[]> {
  const profile = await requireOwner();
  const supabase = await createClient();
  let q = supabase.from("strategic_actors").select("*").eq("user_id", profile.id).eq("actiu", true);
  if (filters?.is_pdi) q = q.eq("is_pdi", true);
  if (filters?.classificacio) q = q.eq("classificacio_relevancia", filters.classificacio);
  const { data } = await q.order("prioritat", { ascending: false }).order("created_at", { ascending: false });
  return (data ?? []).map(normalizeActor);
}

export async function getActor(id: string): Promise<StrategicActor | null> {
  const profile = await requireOwner();
  const supabase = await createClient();
  const { data } = await supabase.from("strategic_actors").select("*").eq("id", id).eq("user_id", profile.id).single();
  return data ? normalizeActor(data) : null;
}

export async function saveActor(formData: FormData): Promise<{ id: string }> {
  const profile = await requireOwner();
  const supabase = await createClient();
  const id = safeText(formData.get("id"));

  // Build sparse payload — only include fields explicitly present in the FormData.
  // This allows tab-specific saves (Conducta, Risc, etc.) without clobbering other fields.
  const p: Record<string, unknown> = { user_id: profile.id, updated_at: new Date().toISOString() };
  const has = (k: string) => formData.has(k);

  const textFields = ["nom","empresa","carrec","pais","idioma","email","telefon","canal_principal",
    "origen_contacte","font_informacio","rol_formal","rol_real","acces_que_aporta","mercat_que_pot_obrir",
    "classificacio_relevancia","estil_comunicacio","estil_decisio","velocitat_resposta","tolerancia_risc",
    "notes_conductuals","classificacio_potencial","justificacio_potencial","classificacio_risc","notes_risc",
    "motiu_pdi","tipus_influencia_pdi","pdi_notes","notes","notes_confidencials"];
  const dateFields = ["data_primer_contacte","data_ultim_contacte"];
  const intFields  = ["poder_decisio","capacitat_execucio","capacitat_influencia","impacte_potencial",
    "impacte_actual","valor_estrategic","urgencia","prioritat","alineacio_objectius","capacitat_caixa",
    "capacitat_portes","capacitat_bloqueig","capacitat_accelerar","fiabilitat_percebuda","consistencia",
    "orientacio_resultat","orientacio_relacio","capacitat_negociacio"];
  const riscFields = ["risc_comercial","risc_reputacional","risc_legal","risc_financer",
    "risc_dependencia","risc_incompliment","risc_bloqueig","risc_conflicte"];
  const arrFields  = ["rol_tipus","trets_conductuals"];

  for (const k of textFields) if (has(k)) p[k] = safeText(formData.get(k));
  for (const k of dateFields) if (has(k)) p[k] = safeDate(formData.get(k));
  for (const k of intFields)  if (has(k)) p[k] = safeInt(formData.get(k));
  for (const k of riscFields) if (has(k)) p[k] = safeInt(formData.get(k)) ?? 0;
  for (const k of arrFields)  if (has(k)) p[k] = safeArr(formData.get(k));
  if (has("is_pdi")) p.is_pdi = formData.get("is_pdi") === "true";

  if (id) {
    const { data } = await supabase.from("strategic_actors").update(p).eq("id", id).eq("user_id", profile.id).select("id").single();
    revalidatePath("/dashboard/bruixola/actors");
    return { id: data?.id ?? id };
  } else {
    const { data } = await supabase.from("strategic_actors").insert(p).select("id").single();
    revalidatePath("/dashboard/bruixola/actors");
    return { id: data?.id ?? "" };
  }
}

export async function deleteActor(id: string): Promise<void> {
  const profile = await requireOwner();
  const supabase = await createClient();
  await supabase.from("strategic_actors").update({ actiu: false }).eq("id", id).eq("user_id", profile.id);
  revalidatePath("/dashboard/bruixola/actors");
}

// ─── Interactions ─────────────────────────────────────────────────────────────

export async function getInteractions(actorId: string): Promise<ActorInteraction[]> {
  const profile = await requireOwner();
  const supabase = await createClient();
  const { data } = await supabase.from("strategic_actor_interactions")
    .select("*")
    .eq("actor_id", actorId)
    .eq("user_id", profile.id)
    .order("data", { ascending: false });
  return (data ?? []) as ActorInteraction[];
}

export async function saveInteraction(formData: FormData): Promise<void> {
  const profile = await requireOwner();
  const supabase = await createClient();
  const id = safeText(formData.get("id"));
  const payload = {
    user_id: profile.id,
    actor_id: formData.get("actor_id") as string,
    tipus: formData.get("tipus") as string,
    titol: formData.get("titol") as string,
    contingut: safeText(formData.get("contingut")),
    data: safeDate(formData.get("data")) ?? new Date().toISOString().split("T")[0],
    resultat: safeText(formData.get("resultat")),
    reaccio_observada: safeText(formData.get("reaccio_observada")),
    seguiment_necessari: formData.get("seguiment_necessari") === "true",
    data_seguiment: safeDate(formData.get("data_seguiment")),
    sensible: formData.get("sensible") === "true",
  };
  if (id) {
    await supabase.from("strategic_actor_interactions").update(payload).eq("id", id).eq("user_id", profile.id);
  } else {
    await supabase.from("strategic_actor_interactions").insert(payload);
  }
  revalidatePath(`/dashboard/bruixola/actors/${payload.actor_id}`);
}

export async function deleteInteraction(id: string, actorId: string): Promise<void> {
  const profile = await requireOwner();
  const supabase = await createClient();
  await supabase.from("strategic_actor_interactions").delete().eq("id", id).eq("user_id", profile.id);
  revalidatePath(`/dashboard/bruixola/actors/${actorId}`);
}

// ─── Links ────────────────────────────────────────────────────────────────────

export async function getLinks(actorId: string): Promise<ActorLink[]> {
  const profile = await requireOwner();
  const supabase = await createClient();
  const { data } = await supabase.from("strategic_actor_links")
    .select("*")
    .eq("actor_id", actorId)
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });
  return (data ?? []) as ActorLink[];
}

export async function saveLink(formData: FormData): Promise<void> {
  const profile = await requireOwner();
  const supabase = await createClient();
  await supabase.from("strategic_actor_links").insert({
    user_id: profile.id,
    actor_id: formData.get("actor_id") as string,
    entitat_tipus: formData.get("entitat_tipus") as string,
    entitat_id: safeText(formData.get("entitat_id")),
    entitat_nom: formData.get("entitat_nom") as string,
    tipus_vincle: safeText(formData.get("tipus_vincle")),
    descripcio: safeText(formData.get("descripcio")),
  });
  revalidatePath(`/dashboard/bruixola/actors/${formData.get("actor_id")}`);
}

export async function updateLink(formData: FormData): Promise<void> {
  const profile = await requireOwner();
  const supabase = await createClient();
  const id = formData.get("id") as string;
  await supabase.from("strategic_actor_links").update({
    entitat_tipus: formData.get("entitat_tipus") as string,
    entitat_id: safeText(formData.get("entitat_id")),
    entitat_nom: formData.get("entitat_nom") as string,
    tipus_vincle: safeText(formData.get("tipus_vincle")),
    descripcio: safeText(formData.get("descripcio")),
  }).eq("id", id).eq("user_id", profile.id);
  revalidatePath(`/dashboard/bruixola/actors/${formData.get("actor_id")}`);
}

export async function deleteLink(id: string, actorId: string): Promise<void> {
  const profile = await requireOwner();
  const supabase = await createClient();
  await supabase.from("strategic_actor_links").delete().eq("id", id).eq("user_id", profile.id);
  revalidatePath(`/dashboard/bruixola/actors/${actorId}`);
}

// ─── IA Analysis ──────────────────────────────────────────────────────────────

export async function analyzeActor(actorId: string): Promise<void> {
  const profile = await requireOwner();
  const supabase = await createClient();

  const { data: actorData } = await supabase.from("strategic_actors").select("*").eq("id", actorId).eq("user_id", profile.id).single();
  if (!actorData) return;

  const [
    { data: interactionData },
    { data: linkData },
    { data: docsData },
  ] = await Promise.all([
    supabase.from("strategic_actor_interactions").select("*").eq("actor_id", actorId).eq("user_id", profile.id).order("data", { ascending: false }).limit(10),
    supabase.from("strategic_actor_links").select("*").eq("actor_id", actorId).eq("user_id", profile.id),
    supabase.from("strategic_actor_documents").select("*").eq("actor_id", actorId).eq("user_id", profile.id).order("created_at", { ascending: false }).limit(5),
  ]);

  const actor = normalizeActor(actorData);
  const interactions = (interactionData ?? []) as ActorInteraction[];
  const links = (linkData ?? []) as ActorLink[];

  const projecteVincles = links.filter(l => l.entitat_tipus === "projecte").map(l => l.entitat_nom);
  const objectiuVincles = links.filter(l => l.entitat_tipus === "objectiu").map(l => l.entitat_nom);

  const prompt = buildActorAnalysisPrompt({
    actor,
    interactions: interactions.map(i => ({
      tipus: i.tipus,
      titol: i.titol,
      contingut: i.contingut,
      data: i.data,
      resultat: i.resultat,
      reaccio_observada: i.reaccio_observada,
    })),
    projectes_vinculats: projecteVincles,
    objectius_vinculats: objectiuVincles,
  });

  // Fetch document contents from storage for enriched analysis
  const docs: Array<{ mediaType: string; base64: string; nom: string; notes: string | null }> = [];
  for (const doc of (docsData ?? [])) {
    try {
      const { data: fileData } = await supabase.storage.from("actor-documents").download(doc.storage_path);
      if (fileData) {
        const buf = await fileData.arrayBuffer();
        const base64 = Buffer.from(buf).toString("base64");
        docs.push({ mediaType: doc.tipus_fitxer ?? "application/pdf", base64, nom: doc.nom_fitxer, notes: doc.notes });
      }
    } catch { /* skip unreadable doc */ }
  }

  const raw = docs.length > 0
    ? await callClaudeWithDocs(prompt, docs, 3000)
    : await callClaude(prompt, 2000);

  let result: ActorAnalysisResult;
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    result = JSON.parse(match ? match[0] : raw);
  } catch {
    return;
  }

  await supabase.from("strategic_actors").update({
    classificacio_potencial: result.classificacio_potencial,
    justificacio_potencial: result.justificacio_potencial,
    potencial_ia: result.potencial_ia,
    classificacio_risc: result.classificacio_risc,
    notes_risc: result.notes_risc,
    estrategia_ia: result.estrategia_ia,
    alertes_ia: result.alertes_ia,
    ai_analisi_complet: result.ai_analisi_complet,
    ai_confianca: result.ai_confianca,
    ai_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", actorId).eq("user_id", profile.id);

  // Mark documents as analysed
  if (docs.length > 0) {
    await supabase.from("strategic_actor_documents").update({ analitzat: true }).eq("actor_id", actorId).eq("user_id", profile.id);
  }

  revalidatePath(`/dashboard/bruixola/actors/${actorId}`);
  revalidatePath("/dashboard/bruixola/actors");
}

// ─── Documents ────────────────────────────────────────────────────────────────

export interface ActorDocument {
  id: string;
  actor_id: string;
  nom_fitxer: string;
  tipus_fitxer: string | null;
  mida_bytes: number | null;
  storage_path: string;
  notes: string | null;
  pregunta_ia: string | null;
  resultat_ia: string | null;
  analitzat: boolean;
  created_at: string;
}

export async function getActorDocuments(actorId: string): Promise<ActorDocument[]> {
  const profile = await requireOwner();
  const supabase = await createClient();
  const { data } = await supabase.from("strategic_actor_documents")
    .select("*")
    .eq("actor_id", actorId)
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });
  return (data ?? []) as ActorDocument[];
}

export async function uploadActorDocument(formData: FormData): Promise<{ id: string }> {
  const profile = await requireOwner();
  const supabase = await createClient();

  const actorId = formData.get("actor_id") as string;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const preguntaIa = (formData.get("pregunta_ia") as string | null)?.trim() || null;
  const file = formData.get("file") as File;
  if (!file || file.size === 0) throw new Error("Cap fitxer seleccionat");

  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${profile.id}/${actorId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const bytes = await file.arrayBuffer();
  const { error } = await supabase.storage.from("actor-documents").upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data: docRecord } = await supabase.from("strategic_actor_documents").insert({
    actor_id: actorId,
    user_id: profile.id,
    nom_fitxer: file.name,
    tipus_fitxer: file.type || null,
    mida_bytes: file.size,
    storage_path: path,
    notes,
    pregunta_ia: preguntaIa,
  }).select("id").single();

  revalidatePath(`/dashboard/bruixola/actors/${actorId}`);
  return { id: docRecord?.id ?? "" };
}

export async function analyzeDocument(documentId: string): Promise<void> {
  const profile = await requireOwner();
  const supabase = await createClient();

  const { data: doc, error: docErr } = await supabase
    .from("strategic_actor_documents")
    .select("*")
    .eq("id", documentId)
    .eq("user_id", profile.id)
    .single();

  if (docErr || !doc) throw new Error(`Document no trobat: ${docErr?.message ?? "desconegut"}`);
  if (!doc.pregunta_ia) throw new Error("El document no té cap pregunta definida");

  // Download from storage
  const { data: fileData, error: storageErr } = await supabase.storage
    .from("actor-documents")
    .download(doc.storage_path);

  if (storageErr || !fileData) {
    const msg = `Error baixant el fitxer: ${storageErr?.message ?? "fitxer no accessible"}`;
    await supabase.from("strategic_actor_documents")
      .update({ resultat_ia: `⚠️ ${msg}`, analitzat: false })
      .eq("id", documentId).eq("user_id", profile.id);
    throw new Error(msg);
  }

  const buf = await fileData.arrayBuffer();
  const base64 = Buffer.from(buf).toString("base64");

  // Anthropic supports PDF and text/* natively; for others send as plain text block
  const mimeType = doc.tipus_fitxer ?? "application/octet-stream";
  const isNativeDoc = mimeType === "application/pdf" || mimeType.startsWith("text/");

  let resultat: string;

  if (isNativeDoc) {
    const prompt = `Ets un analista estratègic. Analitza el document adjunt i respon la pregunta de manera clara i concisa en català.

Pregunta: ${doc.pregunta_ia}

Respon directament la pregunta. Sigues específic i basa't únicament en el contingut del document. Màxim 400 paraules.`;

    resultat = await callClaudeWithDocs(
      prompt,
      [{ mediaType: mimeType, base64, nom: doc.nom_fitxer, notes: doc.notes }],
      1200,
    );
  } else {
    // Non-native type (DOCX, etc.): send as plain text if possible, otherwise error
    let textContent: string;
    try {
      textContent = Buffer.from(buf).toString("utf-8");
    } catch {
      textContent = "(contingut binari no llegible com a text)";
    }

    const prompt = `Ets un analista estratègic. A continuació tens el contingut d'un fitxer (${doc.nom_fitxer}).

CONTINGUT DEL FITXER:
${textContent.slice(0, 8000)}

Pregunta: ${doc.pregunta_ia}

Respon directament la pregunta en català. Sigues específic. Màxim 400 paraules.`;

    resultat = await callClaude(prompt, 1200);
  }

  if (!resultat) {
    resultat = "⚠️ La IA no ha retornat cap resposta. Torna-ho a intentar.";
  }

  await supabase.from("strategic_actor_documents")
    .update({ resultat_ia: resultat, analitzat: true })
    .eq("id", documentId)
    .eq("user_id", profile.id);

  revalidatePath(`/dashboard/bruixola/actors/${doc.actor_id}`);
}

export async function deleteActorDocument(id: string, actorId: string): Promise<void> {
  const profile = await requireOwner();
  const supabase = await createClient();

  const { data: doc } = await supabase.from("strategic_actor_documents")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", profile.id)
    .single();

  if (doc?.storage_path) {
    await supabase.storage.from("actor-documents").remove([doc.storage_path]);
  }

  await supabase.from("strategic_actor_documents").delete().eq("id", id).eq("user_id", profile.id);
  revalidatePath(`/dashboard/bruixola/actors/${actorId}`);
}

export async function getDocumentSignedUrl(storagePath: string): Promise<string | null> {
  const profile = await requireOwner();
  const supabase = await createClient();
  // verify ownership via DB first
  const { data: doc } = await supabase.from("strategic_actor_documents")
    .select("id").eq("storage_path", storagePath).eq("user_id", profile.id).maybeSingle();
  if (!doc) return null;
  const { data } = await supabase.storage.from("actor-documents").createSignedUrl(storagePath, 300);
  return data?.signedUrl ?? null;
}

// ─── PDI ──────────────────────────────────────────────────────────────────────

export async function getPDIActors(): Promise<StrategicActor[]> {
  const profile = await requireOwner();
  const supabase = await createClient();
  const { data } = await supabase.from("strategic_actors").select("*")
    .eq("user_id", profile.id).eq("is_pdi", true).eq("actiu", true)
    .order("prioritat", { ascending: false });
  return (data ?? []).map(normalizeActor);
}

export async function exportPDI(actorId: string): Promise<{ exportId: string; contingut: Record<string, unknown> }> {
  const profile = await requireOwner();
  const supabase = await createClient();

  const { data: actor } = await supabase.from("strategic_actors").select("*").eq("id", actorId).eq("user_id", profile.id).single();
  if (!actor) throw new Error("Actor no trobat");

  // Only export non-sensitive information
  const contingut: Record<string, unknown> = {
    nom: actor.nom,
    empresa: actor.empresa,
    carrec: actor.carrec,
    rol_tipus: actor.rol_tipus,
    classificacio_relevancia: actor.classificacio_relevancia,
    classificacio_potencial: actor.classificacio_potencial,
    motiu_pdi: actor.motiu_pdi,
    tipus_influencia_pdi: actor.tipus_influencia_pdi,
    classificacio_risc: actor.classificacio_risc,
    estrategia_ia: actor.estrategia_ia,
    pdi_notes: actor.pdi_notes,
    exported_at: new Date().toISOString(),
  };

  const { data: exportRecord } = await supabase.from("strategic_pdi_exports").insert({
    actor_id: actorId,
    user_id: profile.id,
    contingut_exportat: contingut,
  }).select("id").single();

  revalidatePath("/dashboard/bruixola/pdi");
  return { exportId: exportRecord?.id ?? "", contingut };
}

export async function getPDIExports(actorId: string): Promise<PDIExport[]> {
  const profile = await requireOwner();
  const supabase = await createClient();
  const { data } = await supabase.from("strategic_pdi_exports")
    .select("*")
    .eq("actor_id", actorId)
    .eq("user_id", profile.id)
    .order("data_export", { ascending: false });
  return (data ?? []) as PDIExport[];
}

// ─── Vincle entity options ─────────────────────────────────────────────────────

export interface VincleOption { id: string; label: string; sub?: string }

export async function getVincleOptions(tipus: string): Promise<VincleOption[]> {
  const profile = await requireOwner();
  const supabase = await createClient();

  if (tipus === "actor") {
    const { data } = await supabase.from("strategic_actors")
      .select("id, nom, empresa, carrec")
      .eq("user_id", profile.id).eq("actiu", true)
      .order("nom");
    return (data ?? []).map(r => ({
      id: r.id,
      label: r.nom,
      sub: [r.carrec, r.empresa].filter(Boolean).join(" · "),
    }));
  }
  if (tipus === "projecte") {
    const { data } = await supabase.from("projectes")
      .select("id, nom, tipus, estat")
      .eq("actiu", true)
      .order("nom");
    return (data ?? []).map(r => ({ id: r.id, label: r.nom, sub: r.tipus ?? "" }));
  }
  if (tipus === "objectiu") {
    const { data } = await supabase.from("objectius")
      .select("id, titol, tipus, estat")
      .order("titol");
    return (data ?? []).map(r => ({ id: r.id, label: r.titol, sub: r.tipus ?? "" }));
  }
  if (tipus === "producte") {
    const { data } = await supabase.from("productes")
      .select("id, nom, tipus, estat")
      .eq("actiu", true)
      .order("nom");
    return (data ?? []).map(r => ({ id: r.id, label: r.nom, sub: r.tipus ?? "" }));
  }
  if (tipus === "client") {
    const { data } = await supabase.from("holded_contacts")
      .select("id, name, city")
      .order("name").limit(300);
    return (data ?? []).map(r => ({ id: r.id, label: r.name, sub: r.city ?? "" }));
  }
  // mercat, institucio, proveidor — no dedicated table, free text
  return [];
}
