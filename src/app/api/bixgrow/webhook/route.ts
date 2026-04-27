import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BixGrowAffiliate {
  email: string;
  first_name?: string;
  last_name?: string;
  program?: string;
  status?: string;
  standard_link?: string;
  referral_code: string;
  date_created?: string;
  [key: string]: unknown;
}

interface BixGrowOrder {
  id?: string;
  order_id?: string;
  affiliate_code?: string;
  referral_code?: string;
  customer_email?: string;
  order_number?: string;
  amount?: number;
  commission_rate?: number;
  commission?: number;
  status?: string;
  date_created?: string;
  [key: string]: unknown;
}

interface BixGrowPayment {
  id?: string;
  payment_id?: string;
  affiliate_code?: string;
  referral_code?: string;
  amount?: number;
  status?: string;
  date_created?: string;
  [key: string]: unknown;
}

type BixGrowPayload =
  | { affiliate: BixGrowAffiliate }
  | { order: BixGrowOrder }
  | { payment: BixGrowPayment };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function detectEventType(payload: Record<string, unknown>): string {
  if ("affiliate" in payload) return "affiliate.created";
  if ("order" in payload) {
    const order = payload.order as BixGrowOrder;
    const status = (order.status ?? "").toLowerCase();
    return status.includes("approv") || status.includes("aprov")
      ? "order.approved"
      : "order.created";
  }
  if ("payment" in payload) {
    const payment = payload.payment as BixGrowPayment;
    const status = (payment.status ?? "").toLowerCase();
    return status === "paid" ? "payment.paid" : "payment.generated";
  }
  return "unknown";
}

async function tryMatchContact(email: string | undefined, db: ReturnType<typeof createAdminClient>) {
  if (!email) return null;
  const { data } = await db
    .from("holded_contacts")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  return data?.id ?? null;
}

async function tryMatchInvoice(orderNumber: string | undefined, db: ReturnType<typeof createAdminClient>) {
  if (!orderNumber) return null;
  const { data } = await db
    .from("holded_invoices")
    .select("id")
    .ilike("doc_number", orderNumber)
    .maybeSingle();
  return data?.id ?? null;
}

async function findAffiliateId(
  code: string | undefined,
  email: string | undefined,
  db: ReturnType<typeof createAdminClient>
): Promise<string | null> {
  if (code) {
    const { data } = await db
      .from("bixgrow_affiliates")
      .select("id")
      .eq("referral_code", code)
      .maybeSingle();
    if (data?.id) return data.id;
  }
  if (email) {
    const { data } = await db
      .from("bixgrow_affiliates")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (data?.id) return data.id;
  }
  return null;
}

// ─── Event handlers ───────────────────────────────────────────────────────────

async function handleAffiliate(data: BixGrowAffiliate, db: ReturnType<typeof createAdminClient>) {
  const contactId = await tryMatchContact(data.email, db);

  await db.from("bixgrow_affiliates").upsert(
    {
      referral_code: data.referral_code || null,
      email:         data.email,
      first_name:    data.first_name  ?? null,
      last_name:     data.last_name   ?? null,
      program:       data.program     ?? null,
      status:        data.status      ?? "Approved",
      standard_link: data.standard_link ?? null,
      contact_id:    contactId,
      raw:           data,
      updated_at:    new Date().toISOString(),
    },
    { onConflict: "email" }
  );
}

async function handleOrder(data: BixGrowOrder, db: ReturnType<typeof createAdminClient>) {
  const id = String(data.id ?? data.order_id ?? `order-${Date.now()}`);
  const affiliateCode = data.affiliate_code ?? data.referral_code;

  const affiliateId = await findAffiliateId(affiliateCode, undefined, db);
  if (!affiliateId) {
    console.warn("[BixGrow] No affiliate found for code:", affiliateCode);
    return;
  }

  const contactId = await tryMatchContact(data.customer_email, db);
  const invoiceId = await tryMatchInvoice(data.order_number, db);

  const status = (() => {
    const s = (data.status ?? "").toLowerCase();
    if (s.includes("approv") || s.includes("aprov")) return "approved";
    return "pending";
  })();

  await db.from("bixgrow_orders").upsert(
    {
      id,
      affiliate_id:    affiliateId,
      contact_id:      contactId,
      invoice_id:      invoiceId,
      customer_email:  data.customer_email ?? null,
      order_number:    data.order_number   ?? null,
      amount:          data.amount          ?? 0,
      commission_rate: data.commission_rate ?? null,
      commission:      data.commission      ?? 0,
      status,
      raw:             data,
      updated_at:      new Date().toISOString(),
    },
    { onConflict: "id" }
  );
}

async function handlePayment(data: BixGrowPayment, db: ReturnType<typeof createAdminClient>) {
  const id = String(data.id ?? data.payment_id ?? `pay-${Date.now()}`);
  const affiliateCode = data.affiliate_code ?? data.referral_code;

  const affiliateId = await findAffiliateId(affiliateCode, undefined, db);
  if (!affiliateId) {
    console.warn("[BixGrow] No affiliate found for code:", affiliateCode);
    return;
  }

  const status = (data.status ?? "").toLowerCase() === "paid" ? "paid" : "generated";

  await db.from("bixgrow_payments").upsert(
    {
      id,
      affiliate_id: affiliateId,
      amount:       data.amount ?? 0,
      status,
      raw:          data,
      updated_at:   new Date().toISOString(),
    },
    { onConflict: "id" }
  );
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = detectEventType(body);
  const db = createAdminClient();

  // Log every event
  await db.from("bixgrow_events").insert({ event_type: eventType, payload: body });

  try {
    const payload = body as BixGrowPayload;

    if ("affiliate" in payload) {
      await handleAffiliate(payload.affiliate, db);
    } else if ("order" in payload) {
      await handleOrder(payload.order, db);
    } else if ("payment" in payload) {
      await handlePayment(payload.payment, db);
    }
  } catch (err) {
    console.error("[BixGrow webhook]", eventType, err);
    // Still return 200 so BixGrow doesn't retry indefinitely
  }

  return Response.json({ ok: true, event: eventType });
}
