"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { updateContact } from "@/lib/holded/api";

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

// ─── Contact type (synced to Holded) ──────────────────────────────────────────

export async function setContactTypeAction(
  contactId: string,
  type: number | null
): Promise<{ error?: string }> {
  const user = await requireOwner();
  if (!user) return { error: "No autorizado" };

  const admin = createAdminClient();

  const { data: contact } = await admin
    .from("holded_contacts")
    .select("name")
    .eq("id", contactId)
    .maybeSingle();
  if (!contact) return { error: "Contacto no encontrado" };

  const { error: dbError } = await admin
    .from("holded_contacts")
    .update({ type })
    .eq("id", contactId);
  if (dbError) return { error: dbError.message };

  try {
    await updateContact(contactId, {
      name: contact.name,
      ...(type !== null ? { type } : {}),
    });
  } catch (e) {
    console.error("[setContactTypeAction] Holded sync failed:", e);
  }

  revalidatePath("/dashboard/admin/asignaciones");
  return {};
}

export async function bulkSetContactTypeAction(
  contactIds: string[],
  type: number | null
): Promise<{ error?: string; updated: number }> {
  const user = await requireOwner();
  if (!user) return { error: "No autorizado", updated: 0 };
  if (!contactIds.length) return { updated: 0 };

  const admin = createAdminClient();

  const { error: dbError } = await admin
    .from("holded_contacts")
    .update({ type })
    .in("id", contactIds);
  if (dbError) return { error: dbError.message, updated: 0 };

  const { data: contacts } = await admin
    .from("holded_contacts")
    .select("id, name")
    .in("id", contactIds);

  for (const c of contacts ?? []) {
    try {
      await updateContact(c.id, {
        name: c.name,
        ...(type !== null ? { type } : {}),
      });
    } catch (e) {
      console.error("[bulkSetContactTypeAction] Holded sync failed for", c.id, e);
    }
  }

  revalidatePath("/dashboard/admin/asignaciones");
  return { updated: contactIds.length };
}

// ─── Recommender ──────────────────────────────────────────────────────────────

export async function setContactRecommenderAction(
  contactId: string,
  recommenderId: string | null
): Promise<{ error?: string }> {
  const user = await requireOwner();
  if (!user) return { error: "No autorizado" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("holded_contacts")
    .update({ recommender_id: recommenderId })
    .eq("id", contactId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin/asignaciones");
  return {};
}

// ─── Contact groups (custom categories → synced as Holded tags) ───────────────

export async function createContactGroupAction(
  name: string,
  color: string,
  holdedTag: string
): Promise<{ error?: string; group?: { id: string } }> {
  const user = await requireOwner();
  if (!user) return { error: "No autorizado" };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contact_groups")
    .insert({ name, color, holded_tag: holdedTag })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin/asignaciones");
  return { group: data };
}

export async function deleteContactGroupAction(
  groupId: string
): Promise<{ error?: string }> {
  const user = await requireOwner();
  if (!user) return { error: "No autorizado" };

  const admin = createAdminClient();
  const { error } = await admin.from("contact_groups").delete().eq("id", groupId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin/asignaciones");
  return {};
}

export async function setContactGroupsAction(
  contactId: string,
  groupIds: string[]
): Promise<{ error?: string }> {
  const user = await requireOwner();
  if (!user) return { error: "No autorizado" };

  const admin = createAdminClient();

  const { data: allGroups } = await admin
    .from("contact_groups")
    .select("id, holded_tag");
  const allGroupTagSet = new Set((allGroups ?? []).map(g => g.holded_tag));
  const selectedGroupIds = new Set(groupIds);
  const selectedGroupTags = (allGroups ?? [])
    .filter(g => selectedGroupIds.has(g.id))
    .map(g => g.holded_tag);

  const { data: contact } = await admin
    .from("holded_contacts")
    .select("name, tags")
    .eq("id", contactId)
    .maybeSingle();
  if (!contact) return { error: "Contacto no encontrado" };

  const existingTags: string[] = Array.isArray(contact.tags) ? contact.tags : [];
  const nonGroupTags = existingTags.filter(t => !allGroupTagSet.has(t));
  const newTags = [...nonGroupTags, ...selectedGroupTags];

  await admin.from("contact_group_members").delete().eq("contact_id", contactId);
  if (groupIds.length > 0) {
    await admin.from("contact_group_members").insert(
      groupIds.map(gid => ({ contact_id: contactId, group_id: gid }))
    );
  }
  await admin.from("holded_contacts").update({ tags: newTags }).eq("id", contactId);

  try {
    await updateContact(contactId, { name: contact.name, tags: newTags });
  } catch (e) {
    console.error("[setContactGroupsAction] Holded sync failed:", e);
  }

  revalidatePath("/dashboard/admin/asignaciones");
  return {};
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
    admin.from("holded_invoices").select("id", { count: "exact", head: true }).eq("contact_id", sourceId),
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

  // 3. Transfer group memberships
  const { data: sourceGroups } = await admin
    .from("contact_group_members")
    .select("group_id")
    .eq("contact_id", sourceId);
  const { data: targetGroups } = await admin
    .from("contact_group_members")
    .select("group_id")
    .eq("contact_id", targetId);
  const targetGroupIds = new Set((targetGroups ?? []).map(r => r.group_id));
  for (const row of sourceGroups ?? []) {
    if (!targetGroupIds.has(row.group_id)) {
      await admin.from("contact_group_members").insert({
        contact_id: targetId,
        group_id: row.group_id,
      });
    }
  }
  await admin.from("contact_group_members").delete().eq("contact_id", sourceId);

  // 4. Copy payment data to target if missing
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
    if (!targetContact?.iban           && sourceContact.iban)           updates.iban           = sourceContact.iban;
    if (!targetContact?.bic            && sourceContact.bic)            updates.bic            = sourceContact.bic;
    if (!targetContact?.payment_method && sourceContact.payment_method) updates.payment_method = sourceContact.payment_method;
    if (!targetContact?.mandate_ref    && sourceContact.mandate_ref)    updates.mandate_ref    = sourceContact.mandate_ref;
    if (Object.keys(updates).length > 0) {
      await admin.from("holded_contacts").update(updates).eq("id", targetId);
    }
  }

  // 5. Mark source as merged
  await admin.from("holded_contacts")
    .update({ merged_into_id: targetId })
    .eq("id", sourceId);

  revalidatePath("/dashboard/admin/asignaciones");
  revalidatePath("/dashboard/clientes");
  return {};
}
