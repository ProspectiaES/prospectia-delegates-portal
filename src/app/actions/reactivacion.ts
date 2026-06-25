"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReactivationEmail } from "@/lib/reactivacion-send";

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

// ── Guardar text editat + idioma + plantilla triada, sense canviar l'estat ───

export async function saveEmailDraft(
  actionId: string, emailText: string, language: "ca" | "es", templateId: string | null
): Promise<ActionResult> {
  const auth = await authorizeAccess(actionId);
  if ("error" in auth) return auth;

  const { error } = await auth.admin.from("reactivation_actions")
    .update({ email_personalizado: emailText, email_language: language, email_template_id: templateId })
    .eq("id", actionId);

  if (error) return { error: error.message };
  return { success: true };
}

// ── Autoritzar l'enviament (pendiente → autorizado) ───────────────────────────

export async function authorizeReactivation(
  actionId: string, emailText: string, language: "ca" | "es", templateId: string | null
): Promise<ActionResult> {
  const auth = await authorizeAccess(actionId);
  if ("error" in auth) return auth;

  const { error } = await auth.admin.from("reactivation_actions")
    .update({
      status: "autorizado",
      email_personalizado: emailText,
      email_language: language,
      email_template_id: templateId,
      authorized_at: new Date().toISOString(),
      authorized_by: auth.userId,
    })
    .eq("id", actionId)
    .eq("status", "pendiente"); // només transiciona des de pendiente

  if (error) return { error: error.message };
  revalidatePath("/dashboard/reactivacion");

  // FASE TEST: l'enviament és sempre manual (botó "Enviar ahora" separat).
  // Per activar l'enviament automàtic en autoritzar, posa
  // REACTIVATION_AUTO_SEND=true a les variables d'entorn — no cal cap canvi
  // de codi més. El cron /api/reactivation/send (comentat al crontab) ja
  // està llest per reactivar-se com a safety-net quan es passi a automàtic.
  if (process.env.REACTIVATION_AUTO_SEND === "true") {
    const sendResult = await sendReactivationEmail(actionId);
    if (!sendResult.success) {
      return { success: true, error: `Autorizado, pero el envío falló: ${sendResult.error ?? sendResult.skipped}` };
    }
  }
  return { success: true };
}

// ── Enviar ara (acció manual explícita, separada de l'autorització) ─────────

export async function sendReactivationNow(actionId: string): Promise<ActionResult> {
  const auth = await authorizeAccess(actionId);
  if ("error" in auth) return auth;

  const result = await sendReactivationEmail(actionId);
  revalidatePath("/dashboard/reactivacion");

  if (!result.success) {
    return { error: result.error ?? result.skipped ?? "No se pudo enviar" };
  }
  return { success: true };
}

// ── Assignar una plantilla ad hoc a aquest client (per categoria+idioma) ─────
// Es desa com a override persistent: la propera vegada que aquest client
// entri en un cicle de reactivació, es precarregarà aquesta plantilla.

export async function assignClientTemplate(
  clientId: string, language: "ca" | "es", templateId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!["OWNER", "ADMIN"].includes(profile?.role ?? "")) return { error: "Sin permisos" };

  const { error } = await admin.from("client_template_overrides").upsert({
    client_id: clientId,
    category: "reactivacion",
    language,
    template_id: templateId,
    created_by: user.id,
  }, { onConflict: "client_id,category,language" });

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
