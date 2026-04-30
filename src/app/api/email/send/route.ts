import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend } from "@/lib/resend";

const APP_URL      = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.prospectia.es";
const DOMAIN       = "prospectia.es";
const NOREPLY_FROM = `Prospectia <notificaciones@${DOMAIN}>`;

function buildFrom(name: string, email: string | null): { from: string; replyTo?: string } {
  if (email && email.endsWith(`@${DOMAIN}`)) {
    return { from: `${name} <${email}>` };
  }
  // External email — send via domain, set reply-to so replies go to the sender
  return {
    from:    `${name} via Prospectia <notificaciones@${DOMAIN}>`,
    replyTo: email ?? undefined,
  };
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    to: string;
    subject: string;
    body: string;
    prospectoId: string;
    templateId: string | null;
  };

  const { to, subject, body: text, prospectoId, templateId } = body;
  if (!to || !subject || !text) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  // Fetch sender profile for name + email
  const admin = createAdminClient();
  const { data: senderProfile } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const senderName  = senderProfile?.full_name ?? "Prospectia";
  const senderEmail = (senderProfile as { email?: string } | null)?.email ?? null;
  const { from, replyTo } = buildFrom(senderName, senderEmail);

  // Create email_send record to get tracking ID
  const { data: sendRecord, error: insertErr } = await admin
    .from("email_sends")
    .insert({
      prospecto_id:  prospectoId,
      sender_id:     user.id,
      template_id:   templateId,
      to_email:      to,
      subject,
      body_text:     text,
    })
    .select("id")
    .single();

  if (insertErr || !sendRecord) {
    return NextResponse.json({ error: insertErr?.message ?? "DB error" }, { status: 500 });
  }

  const trackId  = sendRecord.id as string;
  const pixelUrl = `${APP_URL}/api/track/${trackId}/open`;
  const bodyHtml = text
    .replace(/\n/g, "<br>")
    .concat(`<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none" />`);

  const trackedHtml = bodyHtml.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (_, url) => `href="${APP_URL}/api/track/${trackId}/click?url=${encodeURIComponent(url)}"`
  );

  const result = await resend.emails.send({
    from,
    to,
    subject,
    html:     trackedHtml,
    text,
    replyTo,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  // Save Resend message ID
  await admin
    .from("email_sends")
    .update({ resend_id: result.data?.id ?? null, status: "sent", sent_at: new Date().toISOString() })
    .eq("id", trackId);

  // Log activity on prospecto
  await admin.from("prospecto_activities").insert({
    prospecto_id: prospectoId,
    delegate_id:  user.id,
    type:         "email",
    title:        `Email enviado: ${subject}`,
    notes:        text.slice(0, 300),
    completed_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, id: trackId });
}
