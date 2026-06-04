/**
 * POST /api/mrw/sms
 *
 * Webhook de Twilio — rep els SMS que MRW envia al número virtual de Twilio.
 *
 * Configuració necessària:
 * 1. Comprar un número virtual a Twilio (twilio.com) — aprox. 1€/mes
 * 2. A Twilio Console → Phone Numbers → Messaging → Webhook URL:
 *    https://dashboard.prospectia.es/api/mrw/sms
 * 3. Comunicar a MRW que enviïn els avisos de lliurament a aquest número
 *    (normalment es configura al portal de MRW com "número de notificació")
 * 4. Afegir TWILIO_AUTH_TOKEN a les variables d'entorn del servidor
 *
 * Format típic d'SMS de MRW:
 *   "MRW: El envío [TRACKING] ha sido entregado el [DD/MM] a las [HH:MM]"
 *   "MRW: Envio [TRACKING] entregat el [DD/MM] a les [HH:MM]"
 *   "MRW [TRACKING]: Entregado. Firma: [NOMBRE]"
 *
 * Respon amb TwiML buit (no cal respondre a MRW).
 */

import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Patrons d'SMS de MRW per detectar lliurament
const DELIVERY_PATTERNS = [
  /entregado/i,
  /entregat/i,
  /lliurat/i,
  /delivered/i,
  /ha sido entregado/i,
];

// Extreu el número de tracking de l'SMS
function extractTracking(body: string): string | null {
  // Patrons comuns de MRW: "envío 123456789", "envio 123456789", "MRW 123456789"
  const patterns = [
    /enví[oi]\s+(\d{7,15})/i,
    /envio\s+(\d{7,15})/i,
    /\bMRW[\s:]+(\d{7,15})/i,
    /albar[aà]\s+(\d{7,15})/i,
    /\b(\d{9,12})\b/,  // fallback: número de 9-12 dígits
  ];
  for (const p of patterns) {
    const m = body.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

// Extreu descripció de l'event per mostrar al portal
function extractEvent(body: string): string {
  return body.replace(/\s+/g, " ").trim().slice(0, 200);
}

export async function POST(req: Request) {
  // Twilio envia com application/x-www-form-urlencoded
  const text = await req.text();
  const params = new URLSearchParams(text);

  const from    = params.get("From")    ?? "";
  const body    = params.get("Body")    ?? "";
  const msgSid  = params.get("MessageSid") ?? "";

  console.log(`[MRW SMS] From: ${from} | Body: ${body} | SID: ${msgSid}`);

  // Verificació bàsica: el missatge ha de tenir contingut
  if (!body) {
    return new Response('<Response></Response>', {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const isDelivery = DELIVERY_PATTERNS.some(p => p.test(body));
  const tracking   = extractTracking(body);

  if (isDelivery && tracking) {
    const admin    = createAdminClient();
    const now      = new Date().toISOString();
    const event    = extractEvent(body);

    // Busca el pedido pel número de tracking MRW
    const { data: orders } = await admin
      .from("holded_salesorders")
      .select("id, shipping_status")
      .eq("mrw_tracking_number", tracking)
      .limit(5);

    if (orders && orders.length > 0) {
      for (const order of orders) {
        // Actualitza a entregat (shipping_status = 5) si no ho estava ja
        if ((order.shipping_status ?? 0) < 5) {
          await admin.from("holded_salesorders").update({
            shipping_status:      5,           // 5 = Recibido/Entregado
            mrw_status:           "Entregado",
            mrw_delivered_at:     now,
            mrw_last_event:       event,
            mrw_last_checked_at:  now,
          }).eq("id", order.id);

          console.log(`[MRW SMS] ✓ Pedido ${order.id} marcat com entregat (tracking: ${tracking})`);
        }
      }
    } else {
      console.log(`[MRW SMS] ⚠ No s'ha trobat cap pedido amb tracking ${tracking}`);
    }
  } else if (tracking) {
    // Actualitza el darrer event sense canviar l'estat de lliurament
    const admin = createAdminClient();
    const now   = new Date().toISOString();
    await admin.from("holded_salesorders").update({
      mrw_status:          body.slice(0, 100),
      mrw_last_event:      extractEvent(body),
      mrw_last_checked_at: now,
    }).eq("mrw_tracking_number", tracking);
  }

  // Twilio espera una resposta TwiML vàlida (buit = no enviar res de tornada)
  return new Response("<Response></Response>", {
    headers: { "Content-Type": "text/xml" },
  });
}
