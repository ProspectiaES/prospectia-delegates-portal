import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend } from "@/lib/resend";

const DOMAIN = "prospectia.es";

function buildReminderHtml(activity: {
  title: string; type: string; notes: string | null;
  scheduled_at: string; prospecto_name: string; delegate_name: string;
}, minutesBefore: number): string {
  const when = new Date(activity.scheduled_at).toLocaleString("es-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid",
  });
  const label = minutesBefore >= 1380 ? "mañana" : "en 1 hora";
  const typeEmoji: Record<string, string> = {
    call: "📞", meeting: "🤝", email: "✉️", task: "✅", note: "📝",
  };
  const emoji = typeEmoji[activity.type] ?? "📅";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
    <div style="background:#8E0E1A;padding:20px 24px">
      <p style="color:white;font-size:12px;margin:0;opacity:0.8;text-transform:uppercase;letter-spacing:0.05em">Recordatorio · Prospectia CRM</p>
      <p style="color:white;font-size:20px;font-weight:700;margin:4px 0 0">Tienes una actividad ${label}</p>
    </div>
    <div style="padding:24px">
      <div style="background:#fef2f2;border-radius:8px;padding:16px;margin-bottom:20px">
        <p style="font-size:22px;margin:0 0 8px">${emoji}</p>
        <p style="font-size:16px;font-weight:600;color:#0a0a0a;margin:0 0 4px">${activity.title}</p>
        <p style="font-size:13px;color:#6b7280;margin:0">📅 ${when}</p>
        ${activity.notes ? `<p style="font-size:13px;color:#374151;margin:8px 0 0;white-space:pre-wrap">${activity.notes}</p>` : ""}
      </div>
      <p style="font-size:13px;color:#6b7280;margin:0">
        Prospecto: <strong style="color:#0a0a0a">${activity.prospecto_name}</strong>
      </p>
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid #f3f4f6">
        <a href="https://dashboard.prospectia.es/dashboard/prospectos"
           style="display:inline-block;background:#8E0E1A;color:white;font-size:13px;font-weight:600;padding:10px 20px;border-radius:8px;text-decoration:none">
          Ver en el portal →
        </a>
      </div>
    </div>
    <div style="background:#f9fafb;padding:12px 24px;border-top:1px solid #f3f4f6">
      <p style="font-size:11px;color:#9ca3af;margin:0">Prospectia Delegates Portal · No responder a este email</p>
    </div>
  </div>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const secret = req.nextUrl.searchParams.get("secret") ?? req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now   = new Date();

  // Window: activities scheduled in [now, now+25h] not yet reminded 24h
  const window24hStart = new Date(now.getTime() + 23 * 3600_000).toISOString();
  const window24hEnd   = new Date(now.getTime() + 25 * 3600_000).toISOString();

  // Window: activities scheduled in [now+45min, now+75min] not yet reminded 1h
  const window1hStart  = new Date(now.getTime() + 45 * 60_000).toISOString();
  const window1hEnd    = new Date(now.getTime() + 75 * 60_000).toISOString();

  const { data: activities24h } = await admin
    .from("prospecto_activities")
    .select("*, prospectos(name), profiles!prospecto_activities_delegate_id_fkey(full_name, email)")
    .gte("scheduled_at", window24hStart)
    .lte("scheduled_at", window24hEnd)
    .is("completed_at", null)
    .is("reminder_sent_24h", null);

  const { data: activities1h } = await admin
    .from("prospecto_activities")
    .select("*, prospectos(name), profiles!prospecto_activities_delegate_id_fkey(full_name, email)")
    .gte("scheduled_at", window1hStart)
    .lte("scheduled_at", window1hEnd)
    .is("completed_at", null)
    .is("reminder_sent_1h", null);

  let sent24h = 0;
  let sent1h  = 0;
  const errors: string[] = [];

  async function sendReminder(
    act: Record<string, unknown>,
    minutesBefore: number,
    field: "reminder_sent_24h" | "reminder_sent_1h"
  ) {
    const profile     = act.profiles as { full_name?: string; email?: string } | null;
    const prospecto   = act.prospectos as { name?: string } | null;
    const toEmail     = (act.reminder_email as string | null) ?? profile?.email ?? null;
    if (!toEmail) return;

    const activity = {
      title:          act.title as string,
      type:           act.type as string,
      notes:          act.notes as string | null,
      scheduled_at:   act.scheduled_at as string,
      prospecto_name: prospecto?.name ?? "—",
      delegate_name:  profile?.full_name ?? "—",
    };

    const label = minutesBefore >= 1380 ? "mañana" : "en 1 hora";
    const result = await resend.emails.send({
      from:    `Prospectia CRM <recordatorios@${DOMAIN}>`,
      to:      toEmail,
      subject: `⏰ Recordatorio ${label}: ${activity.title}`,
      html:    buildReminderHtml(activity, minutesBefore),
    });

    if (result.error) {
      errors.push(`${act.id}: ${result.error.message}`);
      return;
    }

    await admin.from("prospecto_activities")
      .update({ [field]: now.toISOString() })
      .eq("id", act.id as string);
  }

  for (const act of (activities24h ?? [])) {
    await sendReminder(act as Record<string, unknown>, 24 * 60, "reminder_sent_24h");
    sent24h++;
  }

  for (const act of (activities1h ?? [])) {
    await sendReminder(act as Record<string, unknown>, 60, "reminder_sent_1h");
    sent1h++;
  }

  return NextResponse.json({
    ok: true,
    sent24h,
    sent1h,
    errors: errors.length ? errors : undefined,
    checkedAt: now.toISOString(),
  });
}
