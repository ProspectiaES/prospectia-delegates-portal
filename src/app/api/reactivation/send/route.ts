import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReactivationEmail } from "@/lib/reactivacion-send";

export const runtime = "nodejs";

/**
 * POST /api/reactivation/send
 *
 * Protegit amb CRON_SECRET (mateix patró que /api/cron/reminders).
 * Processa TOTES les reactivation_actions amb status='autorizado' i les envia.
 *
 * Aquest endpoint actua com a safety-net/retry: l'enviament principal es
 * dispara immediatament des de authorizeReactivation() en autoritzar des del
 * panell. Aquest cron (cada 15-30min) recull qualsevol acció que no s'hagi
 * pogut enviar a la primera (fallada transitòria de Resend, etc.) sense
 * intervenció manual.
 */
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret") ?? req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: pending } = await admin
    .from("reactivation_actions")
    .select("id")
    .eq("status", "autorizado");

  const results: { id: string; success: boolean; error?: string; skipped?: string }[] = [];
  for (const row of pending ?? []) {
    const result = await sendReactivationEmail(row.id);
    results.push({ id: row.id, ...result });
  }

  const sent    = results.filter(r => r.success).length;
  const skipped = results.filter(r => r.skipped).length;
  const failed  = results.filter(r => !r.success && !r.skipped).length;

  return NextResponse.json({ processed: results.length, sent, skipped, failed, results });
}
