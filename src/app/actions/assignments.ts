"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "OWNER") return null;
  return user;
}

// ─── Delegate assignment ───────────────────────────────────────────────────────

export async function setContactDelegateAction(
  contactId: string,
  delegateId: string | null
): Promise<{ error?: string }> {
  const user = await requireOwner();
  if (!user) return { error: "No autorizado" };

  const admin = createAdminClient();
  await admin.from("contact_delegates").delete().eq("contact_id", contactId);

  if (delegateId) {
    const { error } = await admin.from("contact_delegates").insert({
      contact_id: contactId,
      delegate_id: delegateId,
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/dashboard/admin/asignaciones");
  return {};
}

export async function bulkAssignDelegateAction(
  contactIds: string[],
  delegateId: string | null
): Promise<{ error?: string; updated: number }> {
  const user = await requireOwner();
  if (!user) return { error: "No autorizado", updated: 0 };
  if (!contactIds.length) return { updated: 0 };

  const admin = createAdminClient();
  await admin.from("contact_delegates").delete().in("contact_id", contactIds);

  if (delegateId) {
    const rows = contactIds.map(cid => ({ contact_id: cid, delegate_id: delegateId }));
    const { error } = await admin.from("contact_delegates").insert(rows);
    if (error) return { error: error.message, updated: 0 };
  }

  revalidatePath("/dashboard/admin/asignaciones");
  return { updated: contactIds.length };
}

// ─── Mass update (payment method) ─────────────────────────────────────────────

export async function bulkSetPaymentMethodAction(
  contactIds: string[],
  paymentMethod: string
): Promise<{ error?: string; updated: number }> {
  const user = await requireOwner();
  if (!user) return { error: "No autorizado", updated: 0 };
  if (!contactIds.length) return { updated: 0 };

  const admin = createAdminClient();
  const { error } = await admin
    .from("holded_contacts")
    .update({ payment_method: paymentMethod || null })
    .in("id", contactIds);

  if (error) return { error: error.message, updated: 0 };
  revalidatePath("/dashboard/admin/asignaciones");
  return { updated: contactIds.length };
}

// ─── Merge contacts ────────────────────────────────────────────────────────────

export interface MergeCheckResult {
  canMerge: boolean;
  blockers: string[];
  sourceName: string;
  targetName: string;
}

export async function checkMergeAction(
  sourceId: string,
  targetId: string
): Promise<MergeCheckResult> {
  const user = await requireOwner();
  if (!user) return { canMerge: false, blockers: ["No autorizado"], sourceName: "", targetName: "" };
  if (sourceId === targetId) return { canMerge: false, blockers: ["Los contactos son el mismo"], sourceName: "", targetName: "" };

  const admin = createAdminClient();

  const [sourceRes, targetRes, invoicesRes, salesordersRes] = await Promise.all([
    admin.from("holded_contacts").select("id, name, merged_into_id").eq("id", sourceId).maybeSingle(),
    admin.from("holded_contacts").select("id, name, merged_into_id").eq("id", targetId).maybeSingle(),
    // Check if source has Holded invoices — these reference the source ID in Holded and cannot be moved
    admin.from("holded_invoices").select("id", { count: "exact", head: true }).eq("contact_id", sourceId),
    // Check if source has Holded sales orders
    admin.from("holded_salesorders").select("id", { count: "exact", head: true }).eq("contact_id", sourceId),
  ]);

  const source = sourceRes.data;
  const target = targetRes.data;
  const blockers: string[] = [];

  if (!source) blockers.push("El contacto origen no existe");
  if (!target) blockers.push("El contacto destino no existe");
  if (source?.merged_into_id) blockers.push("El origen ya ha sido fusionado anteriormente");
  if (target?.merged_into_id) blockers.push("El destino ya está marcado como fusionado");

  const invoiceCount = invoicesRes.count ?? 0;
  const salesorderCount = salesordersRes.count ?? 0;

  if (invoiceCount > 0) {
    blockers.push(
      `El origen tiene ${invoiceCount} factura${invoiceCount !== 1 ? "s" : ""} en Holded vinculadas a su ID — fusionar crearía un conflicto con Holded`
    );
  }
  if (salesorderCount > 0) {
    blockers.push(
      `El origen tiene ${salesorderCount} pedido${salesorderCount !== 1 ? "s" : ""} en Holded — fusionar crearía un conflicto con Holded`
    );
  }

  return {
    canMerge: blockers.length === 0,
    blockers,
    sourceName: source?.name ?? sourceId,
    targetName: target?.name ?? targetId,
  };
}

export async function mergeContactsAction(
  sourceId: string,
  targetId: string
): Promise<{ error?: string }> {
  const user = await requireOwner();
  if (!user) return { error: "No autorizado" };

  // Re-check before executing
  const check = await checkMergeAction(sourceId, targetId);
  if (!check.canMerge) return { error: check.blockers[0] };

  const admin = createAdminClient();

  // 1. Transfer contact_delegates from source to target (skip duplicates)
  const { data: sourceAssignments } = await admin
    .from("contact_delegates")
    .select("delegate_id")
    .eq("contact_id", sourceId);

  const { data: targetAssignments } = await admin
    .from("contact_delegates")
    .select("delegate_id")
    .eq("contact_id", targetId);

  const targetDelegateIds = new Set((targetAssignments ?? []).map(r => r.delegate_id));

  for (const row of sourceAssignments ?? []) {
    if (!targetDelegateIds.has(row.delegate_id)) {
      await admin.from("contact_delegates").insert({
        contact_id: targetId,
        delegate_id: row.delegate_id,
      });
    }
  }
  await admin.from("contact_delegates").delete().eq("contact_id", sourceId);

  // 2. Transfer tasks linked to source
  await admin.from("tasks").update({ contact_id: targetId }).eq("contact_id", sourceId);

  // 3. Copy payment data to target if target is missing it
  const { data: sourceContact } = await admin
    .from("holded_contacts")
    .select("iban, bic, payment_method, mandate_ref")
    .eq("id", sourceId)
    .maybeSingle();
  const { data: targetContact } = await admin
    .from("holded_contacts")
    .select("iban, bic, payment_method, mandate_ref")
    .eq("id", targetId)
    .maybeSingle();

  if (sourceContact) {
    const updates: Record<string, string | null> = {};
    if (!targetContact?.iban       && sourceContact.iban)           updates.iban           = sourceContact.iban;
    if (!targetContact?.bic        && sourceContact.bic)            updates.bic            = sourceContact.bic;
    if (!targetContact?.payment_method && sourceContact.payment_method) updates.payment_method = sourceContact.payment_method;
    if (!targetContact?.mandate_ref    && sourceContact.mandate_ref)    updates.mandate_ref    = sourceContact.mandate_ref;
    if (Object.keys(updates).length > 0) {
      await admin.from("holded_contacts").update(updates).eq("id", targetId);
    }
  }

  // 4. Mark source as merged
  await admin.from("holded_contacts")
    .update({ merged_into_id: targetId })
    .eq("id", sourceId);

  revalidatePath("/dashboard/admin/asignaciones");
  revalidatePath("/dashboard/clientes");
  return {};
}
