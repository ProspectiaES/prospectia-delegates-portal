import { createAdminClient } from "@/lib/supabase/admin";
import { resend } from "@/lib/resend";

const APP_URL = process.env.APP_URL ?? "https://dashboard.prospectia.es";
const DOMAIN  = "prospectia.es";

export interface SendResult {
  success: boolean;
  error?: string;
  skipped?: string;
}

/**
 * Envia l'email de reactivació per a una acció en estat 'autorizado'.
 * CC al delegat/propietari del compte (owner_id) si té email registrat.
 * Mai envia res si l'estat no és exactament 'autorizado' — comprovat
 * dues vegades: abans de construir l'email i com a condició del UPDATE final.
 */
export async function sendReactivationEmail(actionId: string): Promise<SendResult> {
  const admin = createAdminClient();

  const { data: action } = await admin
    .from("reactivation_actions")
    .select("id, client_id, entity_type, owner_id, status, email_personalizado, email_template_id")
    .eq("id", actionId)
    .maybeSingle();

  if (!action) return { success: false, error: "Acción no encontrada" };
  if (action.status !== "autorizado") return { success: false, error: `Estado inválido: ${action.status}` };
  if (!action.email_personalizado) return { success: false, error: "Sin texto de email" };

  const { data: clientView } = await admin
    .from("v_clients_dormits")
    .select("entity_name, email")
    .eq("entity_id", action.client_id)
    .eq("entity_type", action.entity_type)
    .maybeSingle();

  if (!clientView?.email) {
    await admin.from("reactivation_actions")
      .update({ notes: "No se pudo enviar: el cliente no tiene email registrado en Holded." })
      .eq("id", actionId);
    return { success: false, skipped: "Cliente sin email registrado" };
  }

  // Delegado/propietario — usado para el "From" display name y CC
  let ccEmail: string | null = null;
  let delegateName = "Prospectia";
  if (action.owner_id) {
    const { data: ownerProfile } = await admin
      .from("profiles").select("full_name, delegate_name, email").eq("id", action.owner_id).maybeSingle();
    if (ownerProfile) {
      delegateName = ownerProfile.delegate_name ?? ownerProfile.full_name ?? delegateName;
      ccEmail = (ownerProfile as { email?: string | null }).email ?? null;
    }
  }

  let subject = "¿Cómo te ha ido? Te echamos de menos";
  if (action.email_template_id) {
    const { data: tpl } = await admin.from("email_templates").select("subject").eq("id", action.email_template_id).maybeSingle();
    if (tpl?.subject) subject = tpl.subject;
  }

  // Crear el registre de tracking ABANS d'enviar, per tenir l'ID per al pixel/clicks
  const { data: sendRecord, error: insertErr } = await admin
    .from("email_sends")
    .insert({
      prospecto_id: null,
      sender_id:    action.owner_id,
      template_id:  action.email_template_id,
      to_email:     clientView.email,
      subject,
      body_text:    action.email_personalizado,
    })
    .select("id")
    .single();

  if (insertErr || !sendRecord) {
    return { success: false, error: insertErr?.message ?? "Error al crear registro de envío" };
  }

  const trackId  = sendRecord.id as string;
  const pixelUrl = `${APP_URL}/api/track/${trackId}/open`;
  const bodyHtml = action.email_personalizado
    .replace(/\n/g, "<br>")
    .concat(`<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none" />`);

  const from = `${delegateName} via Prospectia <notificaciones@${DOMAIN}>`;

  const result = await resend.emails.send({
    from,
    to: clientView.email,
    cc: ccEmail ?? undefined,
    replyTo: ccEmail ?? undefined,
    subject,
    html: bodyHtml,
    text: action.email_personalizado,
  });

  if (result.error) {
    await admin.from("email_sends").update({ status: "failed" }).eq("id", trackId);
    return { success: false, error: result.error.message };
  }

  await admin.from("email_sends").update({
    resend_id: result.data?.id ?? null,
    status: "sent",
    sent_at: new Date().toISOString(),
  }).eq("id", trackId);

  await admin.from("reactivation_actions").update({
    status: "enviado",
    sent_at: new Date().toISOString(),
    email_send_id: trackId,
  }).eq("id", actionId).eq("status", "autorizado");

  return { success: true };
}
