"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, isKolUser } from "@/lib/profile";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ProspectoStage } from "@/app/dashboard/prospectos/stages";

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createProspecto(formData: FormData) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const admin = createAdminClient();

  const delegateId = profile.role === "OWNER" || profile.role === "ADMIN"
    ? (formData.get("delegate_id") as string | null) ?? profile.id
    : profile.id;

  const { data, error } = await admin.from("prospectos").insert({
    delegate_id: delegateId,
    name:    (formData.get("name")    as string).trim(),
    email:   (formData.get("email")   as string | null)?.trim() || null,
    phone:   (formData.get("phone")   as string | null)?.trim() || null,
    company: (formData.get("company") as string | null)?.trim() || null,
    city:    (formData.get("city")    as string | null)?.trim() || null,
    country: (formData.get("country") as string | null)?.trim() || "ES",
    stage:   (formData.get("stage")   as string | null) || "nuevo",
    notes:   (formData.get("notes")   as string | null)?.trim() || null,
    source:  (formData.get("source")  as string | null)?.trim() || "manual",
  }).select("id").single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/prospectos");
  redirect(`/dashboard/prospectos/${data.id}`);
}

// ─── Update stage ─────────────────────────────────────────────────────────────

export async function updateProspectoStage(id: string, stage: ProspectoStage) {
  const profile = await getProfile();
  if (!profile) return;

  const admin = createAdminClient();
  await admin.from("prospectos")
    .update({ stage, updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath(`/dashboard/prospectos/${id}`);
  revalidatePath("/dashboard/prospectos");
}

// ─── Update fields ─────────────────────────────────────────────────────────────

export async function updateProspecto(id: string, formData: FormData) {
  const profile = await getProfile();
  if (!profile) return;

  const admin = createAdminClient();
  await admin.from("prospectos").update({
    name:    (formData.get("name")    as string).trim(),
    email:   (formData.get("email")   as string | null)?.trim() || null,
    phone:   (formData.get("phone")   as string | null)?.trim() || null,
    company: (formData.get("company") as string | null)?.trim() || null,
    city:    (formData.get("city")    as string | null)?.trim() || null,
    notes:   (formData.get("notes")   as string | null)?.trim() || null,
    stage:   formData.get("stage") as ProspectoStage,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  revalidatePath(`/dashboard/prospectos/${id}`);
  revalidatePath("/dashboard/prospectos");
}

// ─── Add activity ─────────────────────────────────────────────────────────────

export async function addActivity(prospectoId: string, formData: FormData) {
  const profile = await getProfile();
  if (!profile) return;

  const admin = createAdminClient();
  const scheduledStr = formData.get("scheduled_at") as string | null;

  await admin.from("prospecto_activities").insert({
    prospecto_id:  prospectoId,
    delegate_id:   profile.id,
    type:          (formData.get("type") as string) || "note",
    title:         (formData.get("title") as string).trim(),
    notes:         (formData.get("notes") as string | null)?.trim() || null,
    scheduled_at:  scheduledStr ? new Date(scheduledStr).toISOString() : null,
    completed_at:  formData.get("completed") === "true" ? new Date().toISOString() : null,
  });

  revalidatePath(`/dashboard/prospectos/${prospectoId}`);
}

// ─── Convert to Holded ────────────────────────────────────────────────────────

export async function convertToHolded(prospectoId: string) {
  const profile = await getProfile();
  if (!profile) return { error: "Sin sesión" };

  const admin = createAdminClient();
  const { data: p, error: fetchErr } = await admin
    .from("prospectos")
    .select("*")
    .eq("id", prospectoId)
    .single();

  if (fetchErr || !p) return { error: "Prospecto no encontrado" };
  if (p.holded_contact_id) return { error: "Ya convertido" };

  const apiKey = process.env.HOLDED_API_KEY;
  const res = await fetch("https://api.holded.com/api/invoicing/v1/contacts", {
    method: "POST",
    headers: { accept: "application/json", key: apiKey!, "content-type": "application/json" },
    body: JSON.stringify({
      name:    p.name,
      email:   p.email  ?? undefined,
      phone:   p.phone  ?? undefined,
      address: p.city   ?? undefined,
      code:    undefined,
      type:    1,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    return { error: `Holded error: ${txt}` };
  }

  const json = await res.json() as { id?: string };
  const holdedId = json.id;
  if (!holdedId) return { error: "Holded no devolvió ID" };

  await admin.from("prospectos").update({
    holded_contact_id: holdedId,
    converted_at: new Date().toISOString(),
    stage: "ganado",
    updated_at: new Date().toISOString(),
  }).eq("id", prospectoId);

  revalidatePath(`/dashboard/prospectos/${prospectoId}`);
  return { success: true, holdedId };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteProspecto(id: string) {
  const profile = await getProfile();
  if (!profile) return;

  const admin = createAdminClient();
  await admin.from("prospectos").delete().eq("id", id);
  revalidatePath("/dashboard/prospectos");
  redirect("/dashboard/prospectos");
}

// ─── CSV Import ───────────────────────────────────────────────────────────────

export async function importProspectosCSV(rows: Array<{
  name: string; email?: string; phone?: string;
  company?: string; city?: string; source?: string;
}>) {
  const profile = await getProfile();
  if (!profile) return { error: "Sin sesión" };

  const admin = createAdminClient();
  const records = rows.map(r => ({
    delegate_id: profile.id,
    name:    r.name.trim(),
    email:   r.email?.trim()   || null,
    phone:   r.phone?.trim()   || null,
    company: r.company?.trim() || null,
    city:    r.city?.trim()    || null,
    stage:   "nuevo" as const,
    source:  r.source?.trim()  || "csv",
  }));

  const { error } = await admin.from("prospectos").insert(records);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/prospectos");
  return { count: records.length };
}
