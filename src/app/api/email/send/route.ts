import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, FROM_ADDRESS } from "@/lib/resend";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.prospectia.es";

export async function POST(req: NextRequest) {
  // Auth check
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

  // Create email_send record first to get tracking ID
  const admin = createAdminClient();
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

  const trackId = sendRecord.id as string;
  const pixelUrl = `${APP_URL}/api/track/${trackId}/open`;
  const bodyHtml = text
    .replace(/\n/g, "<br>")
    .concat(`<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none" />`);

  // Wrap links with click tracking
  const trackedHtml = bodyHtml.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (_, url) => `href="${APP_URL}/api/track/${trackId}/click?url=${encodeURIComponent(url)}"`
  );

  const result = await resend.emails.send({
    from:    FROM_ADDRESS,
    to,
    subject,
    html:    trackedHtml,
    text,
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
