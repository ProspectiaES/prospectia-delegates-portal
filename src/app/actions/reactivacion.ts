"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ActionResult = { error?: string; success?: boolean };

async function authorizeAccess(actionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" } as const;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles").select("role").eq("id", user.id).maybeSingle();

  const isOwner = ["OWNER", "ADMIN"].includes(profile?.role ?? "");

  const { data: action } = await admin
    .from("reactivation_actions")
    .select("id, owner_id")
    .eq("id", actionId)
    .maybeSingle();

  if (!action) return { error: "Acción no encontrada" } as const;
  if (!isOwner && action.owner_id !== user.id) return { error: "Sin permisos" } as const;

  return { admin, userId: user.id } as const;
}

// ── Guardar text editat sense canviar l'estat (autosave) ─────────────────────

export async function saveEmailDraft(actionId: string, emailText: string): Promise<ActionResult> {
  const auth = await authorizeAccess(actionId);
  if ("error" in auth) return auth;

  const { error } = await auth.admin.from("reactivation_actions")
    .update({ email_personalizado: emailText })
    .eq("id", actionId);

  if (error) return { error: error.message };
  return { success: true };
}

// ── Autoritzar l'enviament (pendiente → autorizado) ───────────────────────────

export async function authorizeReactivation(actionId: string, emailText: string): Promise<ActionResult> {
  const auth = await authorizeAccess(actionId);
  if ("error" in auth) return auth;

  const { error } = await auth.admin.from("reactivation_actions")
    .update({
      status: "autorizado",
      email_personalizado: emailText,
      authorized_at: new Date().toISOString(),
      authorized_by: auth.userId,
    })
    .eq("id", actionId)
    .eq("status", "pendiente"); // només transiciona des de pendiente

  if (error) return { error: error.message };
  revalidatePath("/dashboard/reactivacion");
  return { success: true };
}

// ── Marcar com a "no contactar" (tanca el cicle sense enviar) ─────────────────

export async function markNoContactar(actionId: string, reason?: string): Promise<ActionResult> {
  const auth = await authorizeAccess(actionId);
  if ("error" in auth) return auth;

  const { error } = await auth.admin.from("reactivation_actions")
    .update({
      status: "cerrado",
      resultado: "no_contactar",
      closed_at: new Date().toISOString(),
      closed_reason: reason ?? "Marcado como no contactar por el propietario",
    })
    .eq("id", actionId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/reactivacion");
  return { success: true };
}

// ── Marcar com a resolt manualment (el client ja ha tornat per altra via) ────

export async function markResueltoManualmente(actionId: string, reason?: string): Promise<ActionResult> {
  const auth = await authorizeAccess(actionId);
  if ("error" in auth) return auth;

  const { error } = await auth.admin.from("reactivation_actions")
    .update({
      status: "cerrado",
      resultado: "reactivado",
      closed_at: new Date().toISOString(),
      closed_reason: reason ?? "Resuelto manualmente por el propietario",
    })
    .eq("id", actionId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/reactivacion");
  return { success: true };
}
