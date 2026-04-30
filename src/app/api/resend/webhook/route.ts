import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createAdminClient } from "@/lib/supabase/admin";

// Resend uses Svix for webhook delivery. Set RESEND_WEBHOOK_SECRET from the
// Resend dashboard (Webhooks → endpoint → Signing Secret).
const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;

type ResendEvent = {
  type: string;
  data: {
    email_id: string;         // Resend message ID (matches resend_id in email_sends)
    bounce?: { type: "hard" | "soft" };
    [k: string]: unknown;
  };
};

export async function POST(req: NextRequest) {
  const body = await req.text();

  // Verify signature if secret is configured
  if (WEBHOOK_SECRET) {
    const svix = new Webhook(WEBHOOK_SECRET);
    try {
      svix.verify(body, {
        "svix-id":        req.headers.get("svix-id") ?? "",
        "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
        "svix-signature": req.headers.get("svix-signature") ?? "",
      });
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(body) as ResendEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, data } = event;
  const resendId = data.email_id;
  if (!resendId) return NextResponse.json({ ok: true }); // ignore non-email events

  const admin = createAdminClient();
  const now   = new Date().toISOString();

  const updates: Record<string, unknown> = {};

  if (type === "email.delivered") {
    updates.status       = "delivered";
    updates.delivered_at = now;
  } else if (type === "email.bounced") {
    updates.status      = "bounced";
    updates.bounced_at  = now;
    updates.bounce_type = data.bounce?.type ?? "hard";
  } else if (type === "email.complained") {
    updates.status        = "complained";
    updates.complained_at = now;
  } else if (type === "email.opened") {
    // Resend's own open tracking — increment ours too as backup
    const { data: rec } = await admin
      .from("email_sends")
      .select("opens, first_opened_at")
      .eq("resend_id", resendId)
      .maybeSingle();
    if (rec) {
      updates.opens           = (rec.opens ?? 0) + 1;
      updates.first_opened_at = rec.first_opened_at ?? now;
      updates.last_opened_at  = now;
      updates.status          = "opened";
    }
  } else if (type === "email.clicked") {
    const { data: rec } = await admin
      .from("email_sends")
      .select("clicks, first_clicked_at")
      .eq("resend_id", resendId)
      .maybeSingle();
    if (rec) {
      updates.clicks           = (rec.clicks ?? 0) + 1;
      updates.first_clicked_at = rec.first_clicked_at ?? now;
      updates.last_clicked_at  = now;
      updates.status           = "clicked";
    }
  }

  if (Object.keys(updates).length > 0) {
    await admin.from("email_sends").update(updates).eq("resend_id", resendId);
  }

  return NextResponse.json({ ok: true });
}
