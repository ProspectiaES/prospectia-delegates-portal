"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SaveDelegatesState {
  error?: string;
  success?: boolean;
}

export async function saveDelegateAssignments(
  _prevState: SaveDelegatesState | null,
  formData: FormData
): Promise<SaveDelegatesState> {
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
  const delegateIds = formData.getAll("delegate_ids") as string[];

  const admin = createAdminClient();

  const { error: delErr } = await admin
    .from("contact_delegates")
    .delete()
    .eq("contact_id", contactId);

  if (delErr) return { error: `Error al limpiar asignaciones: ${delErr.message}` };

  if (delegateIds.length > 0) {
    const { error: insErr } = await admin
      .from("contact_delegates")
      .insert(delegateIds.map((id) => ({ contact_id: contactId, delegate_id: id })));

    if (insErr) return { error: `Error al guardar asignaciones: ${insErr.message}` };
  }

  revalidatePath(`/dashboard/clientes/${contactId}`);
  return { success: true };
}

// ─── Assign contacts to a delegate (from the delegate detail page) ────────────

export async function saveClientAssignmentsForDelegate(
  _prevState: SaveDelegatesState | null,
  formData: FormData
): Promise<SaveDelegatesState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "OWNER") return { error: "Sin permisos" };

  const delegateId = formData.get("delegate_id") as string;
  const contactIds = formData.getAll("contact_ids") as string[];

  const admin = createAdminClient();

  const { error: delErr } = await admin
    .from("contact_delegates")
    .delete()
    .eq("delegate_id", delegateId);

  if (delErr) return { error: `Error al limpiar asignaciones: ${delErr.message}` };

  if (contactIds.length > 0) {
    const { error: insErr } = await admin
      .from("contact_delegates")
      .insert(contactIds.map((contactId) => ({ contact_id: contactId, delegate_id: delegateId })));

    if (insErr) return { error: `Error al guardar asignaciones: ${insErr.message}` };
  }

  revalidatePath(`/dashboard/delegados/${delegateId}`);
  return { success: true };
}

// ─── Assign affiliates to a delegate ─────────────────────────────────────────

export async function saveAffiliateDelegates(
  _prevState: SaveDelegatesState | null,
  formData: FormData
): Promise<SaveDelegatesState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "OWNER") return { error: "Sin permisos" };

  const delegateId          = formData.get("delegate_id") as string;
  const assignedIds         = formData.getAll("affiliate_ids") as string[];
  const allAffiliateIds     = formData.getAll("all_affiliate_ids") as string[];

  const admin = createAdminClient();

  // Assign checked affiliates to this delegate
  if (assignedIds.length > 0) {
    const { error } = await admin
      .from("bixgrow_affiliates")
      .update({ delegate_id: delegateId })
      .in("id", assignedIds);
    if (error) return { error: error.message };
  }

  // Unassign unchecked affiliates that currently belong to this delegate
  const toUnassign = allAffiliateIds.filter((id) => !assignedIds.includes(id));
  if (toUnassign.length > 0) {
    const { error } = await admin
      .from("bixgrow_affiliates")
      .update({ delegate_id: null })
      .in("id", toUnassign)
      .eq("delegate_id", delegateId);
    if (error) return { error: error.message };
  }

  revalidatePath(`/dashboard/delegados/${delegateId}`);
  return { success: true };
}

export async function setAffiliateDelegate(
  _prevState: SaveDelegatesState | null,
  formData: FormData
): Promise<SaveDelegatesState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "OWNER") return { error: "Sin permisos" };

  const affiliateId      = formData.get("affiliate_id") as string;
  const delegateId       = (formData.get("delegate_id") as string) || null;
  const wantsAutofactura = formData.get("wants_autofactura") === "true";

  const admin = createAdminClient();
  const { error } = await admin
    .from("bixgrow_affiliates")
    .update({ delegate_id: delegateId, wants_autofactura: wantsAutofactura })
    .eq("id", affiliateId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/afiliados/${affiliateId}`);
  if (delegateId) revalidatePath(`/dashboard/delegados/${delegateId}`);
  return { success: true };
}
