"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  buildAnamnesiPrompt,
  buildDiagnosticPrompt,
  buildObjectiuSMARTPrompt,
  buildAlertesPrompt,
  type DiagnosticResult,
  type ObjectiuSMART,
  type AnamnesiTorn,
} from "@/lib/bruixola-prompts";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EstatObjectiu = "actiu" | "assolit" | "bloquejat" | "desviat" | "cancelat" | "pendent";
export type EstatProjecte = "actiu" | "congelat" | "completat" | "cancelat" | "pendent";
export type TipusObjectiu = "anual" | "trimestral" | "mensual";

export interface Empresa {
  id: string;
  nom: string;
  tipus: string | null;
  sector: string | null;
  descripcio: string | null;
  activa: boolean;
  created_at: string;
}

export interface Actor {
  id: string;
  empresa_id: string | null;
  nom: string;
  rol_formal: string | null;
  rol_real: string | null;
  area: string | null;
  responsabilitats: string[];
  poder_decisio: number | null;
  capacitat_execucio: number | null;
  carrega_actual: number | null;
  extern: boolean;
  notes: string | null;
  created_at: string;
}

export interface Producte {
  id: string;
  empresa_id: string | null;
  responsable_id: string | null;
  nom: string;
  tipus: string | null;
  descripcio: string | null;
  estat: string;
  recurrent: boolean;
  caixa_actual: number | null;
  caixa_esperada: number | null;
  esforc: number | null;
  potencial: number | null;
  risc: number | null;
  seguent_accio: string | null;
  notes: string | null;
  created_at: string;
}

export interface Projecte {
  id: string;
  empresa_id: string | null;
  producte_id: string | null;
  responsable_id: string | null;
  nom: string;
  descripcio: string | null;
  tipus: string;
  estat: EstatProjecte;
  prioritat: number | null;
  impacte: number | null;
  urgencia: number | null;
  esforc: number | null;
  alineacio_estrategica: number | null;
  data_inici: string | null;
  data_objectiu: string | null;
  progress: number;
  seguent_accio: string | null;
  decisio_pendent: string | null;
  caixa_actual: number | null;
  caixa_esperada: number | null;
  risc_text: string | null;
  notes: string | null;
  created_by: string | null;
  created_by_nom: string | null;
  created_at: string;
  updated_at: string;
}

export interface Objectiu {
  id: string;
  empresa_id: string | null;
  projecte_id: string | null;
  responsable_id: string | null;
  titol: string;
  descripcio: string | null;
  tipus: TipusObjectiu;
  any: number | null;
  trimestre: number | null;
  mes: number | null;
  estat: EstatObjectiu;
  prioritat: number | null;
  impacte: number | null;
  urgencia: number | null;
  esforc: number | null;
  alineacio_estrategica: number | null;
  data_inici: string | null;
  data_objectiu: string | null;
  progress: number;
  metrica: string | null;
  valor_objectiu: number | null;
  valor_actual: number | null;
  desviacio: number | null;
  risc_text: string | null;
  seguent_accio: string | null;
  decisio_pendent: string | null;
  notes: string | null;
  created_by: string | null;
  created_by_nom: string | null;
  created_at: string;
  updated_at: string;
}

export interface KPI {
  id: string;
  empresa_id: string | null;
  objectiu_id: string | null;
  responsable_id: string | null;
  nom: string;
  categoria: string | null;
  valor_actual: number | null;
  valor_objectiu: number | null;
  unitat: string | null;
  tendencia: string | null;
  impacte: number | null;
  frequencia: string;
  actiu: boolean;
  notes: string | null;
  historial?: Array<{ id: string; valor: number; data: string }>;
  created_at: string;
}

export interface Bloquejo {
  id: string;
  projecte_id: string | null;
  objectiu_id: string | null;
  actor_id: string | null;
  titol: string;
  descripcio: string | null;
  tipus: string | null;
  severitat: number;
  resolt: boolean;
  accio_necessaria: string | null;
  created_at: string;
}

export interface Focus {
  id: string;
  declaracio: string;
  periode: string | null;
  prioritats: string[];
  notes: string | null;
  actiu: boolean;
  created_at: string;
}

export interface Diagnostic {
  id: string;
  data_diagnostic: string;
  estat_global: string | null;
  resum_executiu: string | null;
  forces: string[];
  riscos: string[];
  oportunitats: string[];
  problemes: string[];
  dispersio_detectada: boolean;
  focus_recomanat: string | null;
  projectes_congelar: string[];
  projectes_potenciar: string[];
  decisions_pendents: string[];
  seguents_accions: string[];
  recomanacio: string | null;
  created_at: string;
}

export interface BruixolaDashboard {
  focus: Focus | null;
  objectius: Objectiu[];
  projectes: Projecte[];
  kpis: KPI[];
  bloquejos: Bloquejo[];
  diagnostic: Diagnostic | null;
  stats: {
    objectius_actius: number;
    objectius_bloquejats: number;
    objectius_desviats: number;
    projectes_actius: number;
    kpis_desviats: number;
    decisions_pendents: number;
  };
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function requireOwner() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");
  return profile;
}

// Permite OWNER y CONSIGLIERE. Devuelve { profile, ownerId } donde
// ownerId siempre apunta al OWNER de los datos (nunca al CONSIGLIERE).
async function requireBruixola(): Promise<{ profile: NonNullable<Awaited<ReturnType<typeof getProfile>>>; ownerId: string }> {
  const profile = await getProfile();
  if (!profile) redirect("/dashboard");
  if (profile.role === "OWNER") return { profile, ownerId: profile.id };
  if (profile.role === "CONSIGLIERE" && profile.owner_id) return { profile, ownerId: profile.owner_id };
  redirect("/dashboard");
  return { profile: profile!, ownerId: "" }; // unreachable, satisfies TS
}

// ─── Safe converters ──────────────────────────────────────────────────────────

function safeInt(v: FormDataEntryValue | null): number | null {
  if (!v || v === "") return null;
  const n = parseInt(v as string, 10);
  return isNaN(n) ? null : n;
}

function safeNum(v: FormDataEntryValue | null): number | null {
  if (!v || v === "") return null;
  const n = parseFloat(v as string);
  return isNaN(n) ? null : n;
}

function safeText(v: FormDataEntryValue | null): string | null {
  const s = ((v as string) || "").trim();
  return s || null;
}

function safeDate(v: FormDataEntryValue | null): string | null {
  const s = ((v as string) || "").trim();
  return s || null;
}

function safeArr(v: FormDataEntryValue | null): string[] {
  try { return v ? JSON.parse(v as string) : []; } catch { return []; }
}

// ─── Normalizers ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeProjecte(r: any): Projecte {
  return { ...r, responsabilitats: Array.isArray(r.responsabilitats) ? r.responsabilitats : [] };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeActor(r: any): Actor {
  return { ...r, responsabilitats: Array.isArray(r.responsabilitats) ? r.responsabilitats : [] };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeDiagnostic(r: any): Diagnostic {
  return {
    ...r,
    forces: Array.isArray(r.forces) ? r.forces : [],
    riscos: Array.isArray(r.riscos) ? r.riscos : [],
    oportunitats: Array.isArray(r.oportunitats) ? r.oportunitats : [],
    problemes: Array.isArray(r.problemes) ? r.problemes : [],
    projectes_congelar: Array.isArray(r.projectes_congelar) ? r.projectes_congelar : [],
    projectes_potenciar: Array.isArray(r.projectes_potenciar) ? r.projectes_potenciar : [],
    decisions_pendents: Array.isArray(r.decisions_pendents) ? r.decisions_pendents : [],
    seguents_accions: Array.isArray(r.seguents_accions) ? r.seguents_accions : [],
  };
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getBruixolaDashboard(): Promise<BruixolaDashboard> {
  const { ownerId } = await requireBruixola();
  const supabase = await createClient();

  const [
    { data: focusData },
    { data: objectiusData },
    { data: projectesData },
    { data: kpisData },
    { data: bloquejoData },
    { data: diagnosticData },
  ] = await Promise.all([
    supabase.from("bruixola_focus").select("*").eq("user_id", ownerId).eq("actiu", true).order("created_at", { ascending: false }).limit(1),
    supabase.from("bruixola_objectius").select("*").eq("user_id", ownerId).order("prioritat", { ascending: false }),
    supabase.from("bruixola_projectes").select("*").eq("user_id", ownerId).order("prioritat", { ascending: false }),
    supabase.from("bruixola_kpis").select("*").eq("user_id", ownerId).eq("actiu", true),
    supabase.from("bruixola_bloquejos").select("*").eq("user_id", ownerId).eq("resolt", false),
    supabase.from("bruixola_diagnostic").select("*").eq("user_id", ownerId).order("created_at", { ascending: false }).limit(1),
  ]);

  const objectius = (objectiusData ?? []) as Objectiu[];
  const projectes = (projectesData ?? []).map(normalizeProjecte) as Projecte[];
  const kpis = (kpisData ?? []) as KPI[];

  const kpisDesviats = kpis.filter(k =>
    k.valor_actual != null && k.valor_objectiu != null && k.valor_objectiu > 0 &&
    Math.abs((k.valor_actual - k.valor_objectiu) / k.valor_objectiu) > 0.15
  ).length;

  const decisionsPendents =
    objectius.filter(o => o.decisio_pendent).length +
    projectes.filter(p => p.decisio_pendent).length;

  return {
    focus: focusData?.[0] ?? null,
    objectius,
    projectes,
    kpis,
    bloquejos: (bloquejoData ?? []) as Bloquejo[],
    diagnostic: diagnosticData?.[0] ? normalizeDiagnostic(diagnosticData[0]) : null,
    stats: {
      objectius_actius: objectius.filter(o => o.estat === "actiu").length,
      objectius_bloquejats: objectius.filter(o => o.estat === "bloquejat").length,
      objectius_desviats: objectius.filter(o => o.estat === "desviat").length,
      projectes_actius: projectes.filter(p => p.estat === "actiu").length,
      kpis_desviats: kpisDesviats,
      decisions_pendents: decisionsPendents,
    },
  };
}

// ─── Empreses ─────────────────────────────────────────────────────────────────

export async function getEmpreses(): Promise<Empresa[]> {
  const profile = await requireOwner();
  const supabase = await createClient();
  const { data } = await supabase.from("bruixola_empreses").select("*").eq("user_id", profile.id).order("nom");
  return (data ?? []) as Empresa[];
}

export async function saveEmpresa(formData: FormData): Promise<void> {
  const profile = await requireOwner();
  const supabase = await createClient();
  const id = safeText(formData.get("id"));
  const payload = {
    user_id: profile.id,
    nom: formData.get("nom") as string,
    tipus: safeText(formData.get("tipus")),
    sector: safeText(formData.get("sector")),
    descripcio: safeText(formData.get("descripcio")),
  };
  if (id) {
    await supabase.from("bruixola_empreses").update(payload).eq("id", id).eq("user_id", profile.id);
  } else {
    await supabase.from("bruixola_empreses").insert(payload);
  }
  revalidatePath("/dashboard/bruixola/empreses");
}

export async function deleteEmpresa(id: string): Promise<void> {
  const profile = await requireOwner();
  const supabase = await createClient();
  await supabase.from("bruixola_empreses").delete().eq("id", id).eq("user_id", profile.id);
  revalidatePath("/dashboard/bruixola/empreses");
}

// ─── Actors ───────────────────────────────────────────────────────────────────

export async function getActors(): Promise<Actor[]> {
  const profile = await requireOwner();
  const supabase = await createClient();
  const { data } = await supabase.from("bruixola_actors").select("*").eq("user_id", profile.id).order("nom");
  return (data ?? []).map(normalizeActor);
}

export async function saveActor(formData: FormData): Promise<void> {
  const profile = await requireOwner();
  const supabase = await createClient();
  const id = safeText(formData.get("id"));
  const payload = {
    user_id: profile.id,
    empresa_id: safeText(formData.get("empresa_id")),
    nom: formData.get("nom") as string,
    rol_formal: safeText(formData.get("rol_formal")),
    rol_real: safeText(formData.get("rol_real")),
    area: safeText(formData.get("area")),
    poder_decisio: safeInt(formData.get("poder_decisio")),
    capacitat_execucio: safeInt(formData.get("capacitat_execucio")),
    carrega_actual: safeInt(formData.get("carrega_actual")),
    extern: formData.get("extern") === "true",
    notes: safeText(formData.get("notes")),
    updated_at: new Date().toISOString(),
  };
  if (id) {
    await supabase.from("bruixola_actors").update(payload).eq("id", id).eq("user_id", profile.id);
  } else {
    await supabase.from("bruixola_actors").insert(payload);
  }
  revalidatePath("/dashboard/bruixola/empreses");
}

export async function deleteActor(id: string): Promise<void> {
  const profile = await requireOwner();
  const supabase = await createClient();
  await supabase.from("bruixola_actors").delete().eq("id", id).eq("user_id", profile.id);
  revalidatePath("/dashboard/bruixola/empreses");
}

// ─── Productes ────────────────────────────────────────────────────────────────

export async function getProductes(): Promise<Producte[]> {
  const profile = await requireOwner();
  const supabase = await createClient();
  const { data } = await supabase.from("bruixola_productes").select("*").eq("user_id", profile.id).order("nom");
  return (data ?? []) as Producte[];
}

// ─── Projectes ────────────────────────────────────────────────────────────────

export async function getProjectes(): Promise<Projecte[]> {
  const { ownerId } = await requireBruixola();
  const supabase = await createClient();
  const { data } = await supabase.from("bruixola_projectes").select("*").eq("user_id", ownerId).order("prioritat", { ascending: false });
  return (data ?? []).map(normalizeProjecte);
}

export async function getProjecte(id: string): Promise<Projecte | null> {
  const { ownerId } = await requireBruixola();
  const supabase = await createClient();
  const { data } = await supabase.from("bruixola_projectes").select("*").eq("id", id).eq("user_id", ownerId).maybeSingle();
  return data ? normalizeProjecte(data) : null;
}

export async function saveProjecte(formData: FormData): Promise<{ id: string }> {
  const { profile, ownerId } = await requireBruixola();
  const supabase = await createClient();
  const id = safeText(formData.get("id"));
  const base = {
    user_id: ownerId,
    empresa_id: safeText(formData.get("empresa_id")),
    responsable_id: safeText(formData.get("responsable_id")),
    nom: formData.get("nom") as string,
    descripcio: safeText(formData.get("descripcio")),
    tipus: (formData.get("tipus") as string) || "estrategic",
    estat: (formData.get("estat") as EstatProjecte) || "actiu",
    prioritat: safeInt(formData.get("prioritat")),
    impacte: safeInt(formData.get("impacte")),
    urgencia: safeInt(formData.get("urgencia")),
    esforc: safeInt(formData.get("esforc")),
    alineacio_estrategica: safeInt(formData.get("alineacio_estrategica")),
    data_inici: safeDate(formData.get("data_inici")),
    data_objectiu: safeDate(formData.get("data_objectiu")),
    progress: safeInt(formData.get("progress")) ?? 0,
    seguent_accio: safeText(formData.get("seguent_accio")),
    decisio_pendent: safeText(formData.get("decisio_pendent")),
    caixa_actual: safeNum(formData.get("caixa_actual")),
    caixa_esperada: safeNum(formData.get("caixa_esperada")),
    risc_text: safeText(formData.get("risc_text")),
    notes: safeText(formData.get("notes")),
    updated_at: new Date().toISOString(),
  };
  let resultId = id;
  if (id) {
    await supabase.from("bruixola_projectes").update(base).eq("id", id).eq("user_id", ownerId);
  } else {
    const { data } = await supabase.from("bruixola_projectes")
      .insert({ ...base, created_by: profile.id, created_by_nom: profile.full_name })
      .select("id").single();
    resultId = data?.id;
  }
  revalidatePath("/dashboard/bruixola");
  revalidatePath("/dashboard/bruixola/projectes");
  revalidatePath(`/dashboard/bruixola/projectes/${resultId}`);
  return { id: resultId! };
}

export async function deleteProjecte(id: string): Promise<void> {
  const { ownerId } = await requireBruixola();
  const supabase = await createClient();
  await supabase.from("bruixola_projectes").delete().eq("id", id).eq("user_id", ownerId);
  revalidatePath("/dashboard/bruixola/projectes");
  revalidatePath("/dashboard/bruixola");
}

// ─── Objectius ────────────────────────────────────────────────────────────────

export async function getObjectius(filters?: { tipus?: string; any?: number; trimestre?: number; estat?: string }): Promise<Objectiu[]> {
  const { ownerId } = await requireBruixola();
  const supabase = await createClient();
  let q = supabase.from("bruixola_objectius").select("*").eq("user_id", ownerId);
  if (filters?.tipus) q = q.eq("tipus", filters.tipus);
  if (filters?.any) q = q.eq("any", filters.any);
  if (filters?.trimestre) q = q.eq("trimestre", filters.trimestre);
  if (filters?.estat) q = q.eq("estat", filters.estat);
  const { data } = await q.order("prioritat", { ascending: false });
  return (data ?? []) as Objectiu[];
}

export async function getObjectiu(id: string): Promise<Objectiu | null> {
  const { ownerId } = await requireBruixola();
  const supabase = await createClient();
  const { data } = await supabase.from("bruixola_objectius").select("*").eq("id", id).eq("user_id", ownerId).maybeSingle();
  return data as Objectiu | null;
}

export async function saveObjectiu(formData: FormData): Promise<{ id: string }> {
  const { profile, ownerId } = await requireBruixola();
  const supabase = await createClient();
  const id = safeText(formData.get("id"));
  const base = {
    user_id: ownerId,
    empresa_id: safeText(formData.get("empresa_id")),
    projecte_id: safeText(formData.get("projecte_id")),
    responsable_id: safeText(formData.get("responsable_id")),
    titol: formData.get("titol") as string,
    descripcio: safeText(formData.get("descripcio")),
    tipus: (formData.get("tipus") as TipusObjectiu) || "trimestral",
    any: safeInt(formData.get("any")),
    trimestre: safeInt(formData.get("trimestre")),
    mes: safeInt(formData.get("mes")),
    estat: (formData.get("estat") as EstatObjectiu) || "actiu",
    prioritat: safeInt(formData.get("prioritat")),
    impacte: safeInt(formData.get("impacte")),
    urgencia: safeInt(formData.get("urgencia")),
    esforc: safeInt(formData.get("esforc")),
    alineacio_estrategica: safeInt(formData.get("alineacio_estrategica")),
    data_inici: safeDate(formData.get("data_inici")),
    data_objectiu: safeDate(formData.get("data_objectiu")),
    progress: safeInt(formData.get("progress")) ?? 0,
    metrica: safeText(formData.get("metrica")),
    valor_objectiu: safeNum(formData.get("valor_objectiu")),
    valor_actual: safeNum(formData.get("valor_actual")),
    seguent_accio: safeText(formData.get("seguent_accio")),
    decisio_pendent: safeText(formData.get("decisio_pendent")),
    risc_text: safeText(formData.get("risc_text")),
    notes: safeText(formData.get("notes")),
    updated_at: new Date().toISOString(),
  };
  let resultId = id;
  if (id) {
    await supabase.from("bruixola_objectius").update(base).eq("id", id).eq("user_id", ownerId);
  } else {
    const { data } = await supabase.from("bruixola_objectius")
      .insert({ ...base, created_by: profile.id, created_by_nom: profile.full_name })
      .select("id").single();
    resultId = data?.id;
  }
  revalidatePath("/dashboard/bruixola");
  revalidatePath("/dashboard/bruixola/objectius");
  revalidatePath(`/dashboard/bruixola/objectius/${resultId}`);
  return { id: resultId! };
}

export async function deleteObjectiu(id: string): Promise<void> {
  const { ownerId } = await requireBruixola();
  const supabase = await createClient();
  await supabase.from("bruixola_objectius").delete().eq("id", id).eq("user_id", ownerId);
  revalidatePath("/dashboard/bruixola/objectius");
  revalidatePath("/dashboard/bruixola");
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export async function getKPIs(): Promise<KPI[]> {
  const { ownerId } = await requireBruixola();
  const supabase = await createClient();
  const [{ data: kpisData }, { data: historialData }] = await Promise.all([
    supabase.from("bruixola_kpis").select("*").eq("user_id", ownerId).order("categoria"),
    supabase.from("bruixola_kpis_historial").select("kpi_id, valor, data").eq("user_id", ownerId).order("data", { ascending: false }),
  ]);
  const histByKpi: Record<string, Array<{ id: string; valor: number; data: string }>> = {};
  (historialData ?? []).forEach(h => {
    if (!histByKpi[h.kpi_id]) histByKpi[h.kpi_id] = [];
    if (histByKpi[h.kpi_id].length < 8) histByKpi[h.kpi_id].push({ id: h.kpi_id, valor: h.valor, data: h.data });
  });
  return (kpisData ?? []).map(k => ({ ...k, historial: histByKpi[k.id] ?? [] })) as KPI[];
}

export async function saveKPI(formData: FormData): Promise<void> {
  const { ownerId } = await requireBruixola();
  const supabase = await createClient();
  const id = safeText(formData.get("id"));
  const payload = {
    user_id: ownerId,
    empresa_id: safeText(formData.get("empresa_id")),
    objectiu_id: safeText(formData.get("objectiu_id")),
    nom: formData.get("nom") as string,
    categoria: safeText(formData.get("categoria")),
    valor_actual: safeNum(formData.get("valor_actual")),
    valor_objectiu: safeNum(formData.get("valor_objectiu")),
    unitat: safeText(formData.get("unitat")),
    tendencia: safeText(formData.get("tendencia")),
    impacte: safeInt(formData.get("impacte")),
    frequencia: (formData.get("frequencia") as string) || "mensual",
    notes: safeText(formData.get("notes")),
    updated_at: new Date().toISOString(),
  };
  if (id) {
    await supabase.from("bruixola_kpis").update(payload).eq("id", id).eq("user_id", ownerId);
  } else {
    await supabase.from("bruixola_kpis").insert(payload);
  }
  revalidatePath("/dashboard/bruixola/kpis");
  revalidatePath("/dashboard/bruixola");
}

export async function addKPIValor(kpiId: string, valor: number, data?: string, notes?: string | null): Promise<void> {
  const { ownerId } = await requireBruixola();
  const supabase = await createClient();
  await supabase.from("bruixola_kpis_historial").insert({
    kpi_id: kpiId, user_id: ownerId, valor, data: data ?? new Date().toISOString().slice(0, 10), notes: notes || null,
  });
  await supabase.from("bruixola_kpis").update({ valor_actual: valor, updated_at: new Date().toISOString() }).eq("id", kpiId).eq("user_id", ownerId);
  revalidatePath("/dashboard/bruixola/kpis");
  revalidatePath("/dashboard/bruixola");
}

export async function deleteKPI(id: string): Promise<void> {
  const { ownerId } = await requireBruixola();
  const supabase = await createClient();
  await supabase.from("bruixola_kpis").delete().eq("id", id).eq("user_id", ownerId);
  revalidatePath("/dashboard/bruixola/kpis");
}

// ─── Bloquejos ────────────────────────────────────────────────────────────────

export async function saveBloqueig(formData: FormData): Promise<void> {
  const { ownerId } = await requireBruixola();
  const supabase = await createClient();
  const id = safeText(formData.get("id"));
  const payload = {
    user_id: ownerId,
    projecte_id: safeText(formData.get("projecte_id")),
    objectiu_id: safeText(formData.get("objectiu_id")),
    titol: formData.get("titol") as string,
    descripcio: safeText(formData.get("descripcio")),
    tipus: safeText(formData.get("tipus")),
    severitat: safeInt(formData.get("severitat")) ?? 3,
    accio_necessaria: safeText(formData.get("accio_necessaria")),
    updated_at: new Date().toISOString(),
  };
  if (id) {
    await supabase.from("bruixola_bloquejos").update(payload).eq("id", id).eq("user_id", ownerId);
  } else {
    await supabase.from("bruixola_bloquejos").insert(payload);
  }
  revalidatePath("/dashboard/bruixola");
}

export async function resoldreBloquejo(id: string): Promise<void> {
  const { ownerId } = await requireBruixola();
  const supabase = await createClient();
  await supabase.from("bruixola_bloquejos").update({ resolt: true, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", ownerId);
  revalidatePath("/dashboard/bruixola");
}

// ─── Focus ────────────────────────────────────────────────────────────────────

export async function saveFocus(formData: FormData): Promise<void> {
  const profile = await requireOwner();
  const supabase = await createClient();
  await supabase.from("bruixola_focus").update({ actiu: false }).eq("user_id", profile.id);
  await supabase.from("bruixola_focus").insert({
    user_id: profile.id,
    declaracio: formData.get("declaracio") as string,
    periode: safeText(formData.get("periode")),
    prioritats: safeArr(formData.get("prioritats")),
    notes: safeText(formData.get("notes")),
    actiu: true,
  });
  revalidatePath("/dashboard/bruixola");
}

// ─── Anamnesi ─────────────────────────────────────────────────────────────────

export async function getAnamnesi(): Promise<AnamnesiTorn[]> {
  const profile = await requireOwner();
  const supabase = await createClient();
  const { data } = await supabase.from("bruixola_anamnesi").select("*").eq("user_id", profile.id).order("ordre");
  return (data ?? []).map(r => ({
    fase: r.fase,
    pregunta: r.pregunta,
    resposta: r.resposta ?? undefined,
  }));
}

// Returns answered responses keyed by ordre (1-25)
export async function getAnamnesiRespostes(): Promise<Record<number, string>> {
  const profile = await requireOwner();
  const supabase = await createClient();
  const { data } = await supabase
    .from("bruixola_anamnesi").select("ordre, resposta")
    .eq("user_id", profile.id).not("resposta", "is", null);
  const result: Record<number, string> = {};
  for (const row of data ?? []) {
    if (row.ordre && row.resposta) result[row.ordre] = row.resposta;
  }
  return result;
}

// Save a single answer for a fixed question (ordre 1-25)
export async function saveAnamnesiAnswer(ordre: number, resposta: string): Promise<void> {
  const profile = await requireOwner();
  const supabase = await createClient();
  const { ANAMNESI_PREGUNTES } = await import("@/lib/bruixola-prompts");
  const q = ANAMNESI_PREGUNTES.find(p => p.ordre === ordre);
  if (!q) return;
  await supabase.from("bruixola_anamnesi").upsert({
    user_id: profile.id,
    ordre,
    fase: q.fase,
    pregunta: q.text,
    resposta: resposta.trim(),
    completada: true,
  }, { onConflict: "user_id,ordre" });
  revalidatePath("/dashboard/bruixola/anamnesi");
}

export async function resetAnamnesi(): Promise<void> {
  const profile = await requireOwner();
  const supabase = await createClient();
  await supabase.from("bruixola_anamnesi").delete().eq("user_id", profile.id);
  revalidatePath("/dashboard/bruixola/anamnesi");
}

// ─── Diagnòstic ───────────────────────────────────────────────────────────────

export async function getDiagnostic(): Promise<Diagnostic | null> {
  const { ownerId } = await requireBruixola();
  const supabase = await createClient();
  const { data } = await supabase.from("bruixola_diagnostic").select("*").eq("user_id", ownerId).order("created_at", { ascending: false }).limit(1);
  return data?.[0] ? normalizeDiagnostic(data[0]) : null;
}

export async function generateDiagnostic(): Promise<DiagnosticResult> {
  const profile = await requireOwner();
  const supabase = await createClient();

  const [
    { data: empresesData },
    { data: actorsData },
    { data: productesData },
    { data: projectesData },
    { data: objectiusData },
    { data: anamnesiData },
  ] = await Promise.all([
    supabase.from("bruixola_empreses").select("nom,tipus,sector").eq("user_id", profile.id),
    supabase.from("bruixola_actors").select("nom,rol_formal,rol_real,poder_decisio,carrega_actual").eq("user_id", profile.id),
    supabase.from("bruixola_productes").select("nom,tipus,estat,caixa_actual,potencial,esforc").eq("user_id", profile.id),
    supabase.from("bruixola_projectes").select("nom,estat,prioritat,impacte,esforc,seguent_accio").eq("user_id", profile.id),
    supabase.from("bruixola_objectius").select("titol,tipus,estat,progress").eq("user_id", profile.id),
    supabase.from("bruixola_anamnesi").select("fase,pregunta,resposta").eq("user_id", profile.id).eq("completada", true).order("ordre"),
  ]);

  const prompt = buildDiagnosticPrompt({
    empreses: (empresesData ?? []) as Parameters<typeof buildDiagnosticPrompt>[0]["empreses"],
    actors: (actorsData ?? []) as Parameters<typeof buildDiagnosticPrompt>[0]["actors"],
    productes: (productesData ?? []) as Parameters<typeof buildDiagnosticPrompt>[0]["productes"],
    projectes: (projectesData ?? []) as Parameters<typeof buildDiagnosticPrompt>[0]["projectes"],
    objectius: (objectiusData ?? []) as Parameters<typeof buildDiagnosticPrompt>[0]["objectius"],
    anamnesi: (anamnesiData ?? []).map(r => ({ fase: r.fase, pregunta: r.pregunta, resposta: r.resposta ?? undefined })),
  });

  const raw = await callClaude(prompt, 1200, "claude-sonnet-4-6");
  let result: DiagnosticResult;
  try {
    const jm = raw.match(/\{[\s\S]*\}/);
    result = JSON.parse(jm?.[0] ?? raw);
  } catch {
    throw new Error("Error parsejant el diagnòstic IA");
  }

  await supabase.from("bruixola_diagnostic").insert({
    user_id: profile.id,
    data_diagnostic: new Date().toISOString().slice(0, 10),
    estat_global: result.estat_global,
    resum_executiu: result.resum_executiu,
    forces: result.forces,
    riscos: result.riscos,
    oportunitats: result.oportunitats,
    problemes: result.problemes,
    dispersio_detectada: result.dispersio_detectada,
    focus_recomanat: result.focus_recomanat,
    projectes_congelar: result.projectes_congelar,
    projectes_potenciar: result.projectes_potenciar,
    decisions_pendents: result.decisions_pendents,
    seguents_accions: result.seguents_accions,
    recomanacio: result.recomanacio,
  });

  revalidatePath("/dashboard/bruixola");
  revalidatePath("/dashboard/bruixola/diagnostic");
  return result;
}

// ─── Objectiu SMART ───────────────────────────────────────────────────────────

export async function generarObjectiuSMART(idea: string): Promise<ObjectiuSMART & { problema: string | null }> {
  const profile = await requireOwner();
  const supabase = await createClient();
  const [{ data: empresesData }, { data: actorsData }, { data: projectesData }] = await Promise.all([
    supabase.from("bruixola_empreses").select("nom").eq("user_id", profile.id),
    supabase.from("bruixola_actors").select("nom").eq("user_id", profile.id),
    supabase.from("bruixola_projectes").select("nom").eq("user_id", profile.id).eq("estat", "actiu"),
  ]);
  const prompt = buildObjectiuSMARTPrompt(idea, {
    empreses: (empresesData ?? []).map(e => e.nom),
    actors: (actorsData ?? []).map(a => a.nom),
    projectes: (projectesData ?? []).map(p => p.nom),
  });
  const raw = await callClaude(prompt, 600, "claude-haiku-4-5-20251001");
  try {
    const jm = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(jm?.[0] ?? raw);
  } catch {
    return { titol: null as unknown as string, problema: "Error parsejant la resposta IA", descripcio: "", metrica: "", valor_objectiu: null, data_objectiu: null, prioritat: 3, impacte: 3, esforc: 3, seguent_accio: "" };
  }
}

// ─── Alertes ──────────────────────────────────────────────────────────────────

export async function getAlertes(): Promise<Array<{ tipus: string; area: string; missatge: string; accio: string }>> {
  const profile = await requireOwner();
  const supabase = await createClient();
  const [{ data: objectiusData }, { data: projectesData }, { data: kpisData }] = await Promise.all([
    supabase.from("bruixola_objectius").select("titol,estat,progress,data_objectiu,seguent_accio").eq("user_id", profile.id).eq("estat", "actiu"),
    supabase.from("bruixola_projectes").select("nom,estat,seguent_accio,data_objectiu").eq("user_id", profile.id).eq("estat", "actiu"),
    supabase.from("bruixola_kpis").select("nom,valor_actual,valor_objectiu,tendencia").eq("user_id", profile.id).eq("actiu", true),
  ]);
  if (!objectiusData?.length && !projectesData?.length && !kpisData?.length) return [];
  const prompt = buildAlertesPrompt({
    objectius: (objectiusData ?? []) as Parameters<typeof buildAlertesPrompt>[0]["objectius"],
    projectes: (projectesData ?? []) as Parameters<typeof buildAlertesPrompt>[0]["projectes"],
    kpis: (kpisData ?? []) as Parameters<typeof buildAlertesPrompt>[0]["kpis"],
  });
  const raw = await callClaude(prompt, 400, "claude-haiku-4-5-20251001");
  try {
    const jm = raw.match(/\{[\s\S]*\}/);
    const result = JSON.parse(jm?.[0] ?? raw);
    return result.alertes ?? [];
  } catch { return []; }
}

// ─── Claude helper ────────────────────────────────────────────────────────────

async function callClaude(prompt: string, maxTokens = 800, model = "claude-haiku-4-5-20251001"): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Claude error: ${res.status}`);
  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  return data.content.find(b => b.type === "text")?.text ?? "";
}
