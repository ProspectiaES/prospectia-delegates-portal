"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateContact } from "@/lib/holded/api";

export interface UpdateContactState {
  error?: string;
  success?: boolean;
}

export async function updateContactAction(
  _prevState: UpdateContactState | null,
  formData: FormData
): Promise<UpdateContactState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const id = formData.get("id") as string;
  if (!id) return { error: "ID de contacto no encontrado" };

  const name = (formData.get("name") as string ?? "").trim();
  if (!name) return { error: "El nombre es obligatorio" };

  const tagsRaw = (formData.get("tags") as string ?? "").trim();
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

  const typeStr = formData.get("type") as string;
  const type = typeStr !== "" ? parseInt(typeStr, 10) : undefined;

  const recargo = formData.get("recargo") === "on";
  const recargoCode = recargo ? "s_rec_14" : "";

  const payload = {
    name,
    code:   (formData.get("code")   as string) || undefined,
    email:  (formData.get("email")  as string) || undefined,
    phone:  (formData.get("phone")  as string) || undefined,
    mobile: (formData.get("mobile") as string) || undefined,
    type,
    tags,
    billAddress: {
      address:    (formData.get("address")     as string) || undefined,
      city:       (formData.get("city")        as string) || undefined,
      postalCode: (formData.get("postal_code") as string) || undefined,
      province:   (formData.get("province")    as string) || undefined,
      country:    (formData.get("country")     as string) || undefined,
    },
    defaults: { salesTax: recargoCode },
  };

  try {
    await updateContact(id, payload);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al actualizar en Holded" };
  }

  // Check ownership for payment field updates
  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isOwner = profileData?.role === "OWNER";

  const admin = createAdminClient();

  // Merge salesTax into existing raw so recargo is readable immediately
  const { data: currentContact } = await admin
    .from("holded_contacts")
    .select("raw")
    .eq("id", id)
    .maybeSingle();
  const currentRaw = (currentContact?.raw ?? {}) as Record<string, unknown>;
  const currentDefaults = (currentRaw.defaults as Record<string, unknown>) ?? {};
  const updatedRaw = { ...currentRaw, defaults: { ...currentDefaults, salesTax: recargoCode } };

  const dbUpdate: Record<string, unknown> = {
    name:        payload.name,
    code:        payload.code        ?? null,
    email:       payload.email       ?? null,
    phone:       payload.phone       ?? null,
    mobile:      payload.mobile      ?? null,
    type:        payload.type        ?? null,
    tags:        payload.tags        ?? [],
    address:     payload.billAddress?.address    ?? null,
    city:        payload.billAddress?.city       ?? null,
    postal_code: payload.billAddress?.postalCode ?? null,
    province:    payload.billAddress?.province   ?? null,
    country:     payload.billAddress?.country    ?? null,
    raw:         updatedRaw,
    last_synced_at: new Date().toISOString(),
  };

  if (isOwner) {
    const paymentMethod = (formData.get("payment_method") as string) || null;
    const iban = (formData.get("iban") as string)?.trim().replace(/\s+/g, "") || null;
    const bic  = (formData.get("bic")  as string)?.trim().toUpperCase() || null;
    dbUpdate.payment_method = paymentMethod;
    dbUpdate.iban = iban;
    dbUpdate.bic  = bic;
  }

  const { error: dbErr } = await admin.from("holded_contacts").update(dbUpdate).eq("id", id);

  if (dbErr) {
    return { error: `Holded actualizado, pero error al sincronizar BD: ${dbErr.message}` };
  }

  revalidatePath(`/dashboard/clientes/${id}`);
  revalidatePath("/dashboard/clientes");

  return { success: true };
}

// ─── Assign affiliate to contact ─────────────────────────────────────────────

export async function saveContactAffiliate(
  _prev: UpdateContactState | null,
  formData: FormData
): Promise<UpdateContactState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "OWNER") return { error: "Sin permisos" };

  const contactId   = formData.get("contact_id") as string;
  const affiliateId = (formData.get("affiliate_id") as string) || null;

  const admin = createAdminClient();
  const { error } = await admin
    .from("holded_contacts")
    .update({ affiliate_id: affiliateId })
    .eq("id", contactId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/clientes/${contactId}`);
  return { success: true };
}

// ─── Save payment method + banking data ──────────────────────────────────────

export async function saveContactPayment(
  _prev: UpdateContactState | null,
  formData: FormData
): Promise<UpdateContactState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "OWNER") return { error: "Sin permisos" };

  const contactId     = formData.get("contact_id")     as string;
  const paymentMethod = (formData.get("payment_method") as string) || null;
  const iban          = (formData.get("iban")           as string)?.trim().replace(/\s+/g, "") || null;
  const bic           = (formData.get("bic")            as string)?.trim().toUpperCase()       || null;

  const admin = createAdminClient();
  const { error } = await admin
    .from("holded_contacts")
    .update({ payment_method: paymentMethod, iban, bic })
    .eq("id", contactId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/clientes/${contactId}`);
  return { success: true };
}

// ─── Assign KOL / Coordinador / Comisión 6 profile to contact ────────────────

function makeProfileAssignAction(field: "kol_id" | "coordinator_id" | "commission_6_id") {
  return async function (
    _prev: UpdateContactState | null,
    formData: FormData
  ): Promise<UpdateContactState> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "OWNER") return { error: "Sin permisos" };

    const contactId = formData.get("contact_id") as string;
    const profileId = (formData.get("profile_id") as string) || null;

    const admin = createAdminClient();
    const { error } = await admin
      .from("holded_contacts")
      .update({ [field]: profileId })
      .eq("id", contactId);

    if (error) return { error: error.message };

    revalidatePath(`/dashboard/clientes/${contactId}`);
    return { success: true };
  };
}

export const saveContactKOL          = makeProfileAssignAction("kol_id");
export const saveContactCoordinator  = makeProfileAssignAction("coordinator_id");
export const saveContactCommission6  = makeProfileAssignAction("commission_6_id");

// ─── Assign recommender to contact ───────────────────────────────────────────

export async function saveContactRecommender(
  _prev: UpdateContactState | null,
  formData: FormData
): Promise<UpdateContactState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "OWNER") return { error: "Sin permisos" };

  const contactId     = formData.get("contact_id")     as string;
  const recommenderId = (formData.get("recommender_id") as string) || null;

  const admin = createAdminClient();
  const { error } = await admin
    .from("holded_contacts")
    .update({ recommender_id: recommenderId })
    .eq("id", contactId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/clientes/${contactId}`);
  return { success: true };
}

export async function toggleInternacional(contactId: string, value: boolean) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticat" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "OWNER") return { error: "Sin permisos" };

  const admin = createAdminClient();
  const { error } = await admin.from("holded_contacts").update({ is_internacional: value }).eq("id", contactId);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/clientes/${contactId}`);
  revalidatePath(`/dashboard/bruixola/internacional`);
  revalidatePath(`/dashboard/bruixola/internacional/assignar`);
  revalidatePath(`/dashboard/admin/asignaciones`);
  return { success: true };
}

export async function toggleRecargoEquivalencia(contactId: string, value: boolean) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticat" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "OWNER") return { error: "Sin permisos" };

  const admin = createAdminClient();
  const { error } = await admin.from("holded_contacts")
    .update({ has_recargo_equivalencia: value })
    .eq("id", contactId);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/clientes/${contactId}`);
  return { success: true };
}

export async function bulkSetInternacional(toAdd: string[], toRemove: string[]) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticat" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "OWNER") return { error: "Sin permisos" };

  const admin = createAdminClient();

  if (toAdd.length > 0) {
    const { error } = await admin.from("holded_contacts").update({ is_internacional: true }).in("id", toAdd);
    if (error) return { error: error.message };
  }
  if (toRemove.length > 0) {
    const { error } = await admin.from("holded_contacts").update({ is_internacional: false }).in("id", toRemove);
    if (error) return { error: error.message };
  }

  revalidatePath(`/dashboard/bruixola/internacional`);
  revalidatePath(`/dashboard/bruixola/internacional/assignar`);
  revalidatePath(`/dashboard/admin/asignaciones`);
  return { success: true };
}
