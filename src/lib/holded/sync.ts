import { SupabaseClient } from "@supabase/supabase-js";
import {
  getAllContacts,
  getAllDocuments,
  getAllProducts,
  getDocuments,
  docAmount,
  type HoldedContact,
  type HoldedDocument,
  type HoldedProduct,
} from "./api";

const BATCH = 200;

// ─── Mappers ─────────────────────────────────────────────────────────────────

const CONTACT_TYPE: Record<string, number> = {
  lead: 0, client: 1, provider: 2, creditor: 3, debtor: 4,
};

function resolveContactType(t: number | string | undefined): number | null {
  if (t == null) return null;
  if (typeof t === "number") return t;
  return CONTACT_TYPE[t.toLowerCase()] ?? null;
}

function toContactRow(c: HoldedContact) {
  return {
    id:             c.id,
    name:           c.name ?? "",
    code:           c.code           ?? null,
    email:          c.email          ?? null,
    phone:          c.phone          ?? null,
    mobile:         c.mobile         ?? null,
    type:           resolveContactType(c.type),
    tags:           Array.isArray(c.tags) ? c.tags : [],
    address:        c.billAddress?.address    ?? null,
    city:           c.billAddress?.city       ?? null,
    postal_code:    c.billAddress?.postalCode ?? null,
    province:       c.billAddress?.province   ?? null,
    country:        c.billAddress?.country    ?? null,
    country_code:   c.billAddress?.countryCode ?? null,
    raw:            c,
    last_synced_at: new Date().toISOString(),
  };
}

// Holded's list API returns status:0 for all emitted (non-draft) invoices.
// Real payment status must be derived from paymentsPending / dueDate.
function computeInvoiceStatus(d: HoldedDocument): number {
  const raw = d as Record<string, unknown>;
  const isDraft = raw.draft === true;
  if (isDraft) return 0;

  const pending = typeof raw.paymentsPending === "number" ? raw.paymentsPending : null;
  const paid    = typeof raw.paymentsTotal   === "number" ? raw.paymentsTotal   : null;
  const total   = docAmount(d);

  if (pending !== null && pending <= 0)                   return 3; // Cobrada
  if (paid    !== null && total > 0 && paid >= total)     return 3; // Cobrada

  const nowSec = Math.floor(Date.now() / 1000);
  if (d.dueDate && d.dueDate < nowSec)                    return 2; // Vencida

  return 1; // Pendiente
}

function toInvoiceRow(d: HoldedDocument, isCreditNote = false) {
  const raw = d as Record<string, unknown>;
  return {
    id:                  d.id,
    doc_number:          d.docNumber          ?? null,
    contact_id:          d.contact            ?? null,
    contact_name:        d.contactName        ?? null,
    date:                d.date ? new Date(d.date * 1000).toISOString() : null,
    due_date:            d.dueDate ? new Date(d.dueDate * 1000).toISOString() : null,
    date_last_modified:  d.dateLastModified
                           ? new Date(d.dateLastModified * 1000).toISOString()
                           : null,
    total:               docAmount(d),
    status:              computeInvoiceStatus(d),
    is_credit_note:      isCreditNote,
    doc_num_ref:         isCreditNote ? ((raw.docNumRef as string) ?? null) : null,
    description:         d.desc ?? d.notes ?? null,
    raw:                 d,
    last_synced_at:      new Date().toISOString(),
  };
}

function toProductRow(p: HoldedProduct) {
  return {
    id:             p.id,
    name:           p.name ?? "",
    description:    p.desc           ?? null,
    sku:            p.sku            ?? null,
    barcode:        p.barcode        ?? null,
    factory_code:   p.factoryCode    ?? null,
    kind:           p.kind           ?? null,
    price:          typeof p.price        === "number" ? p.price        : null,
    total:          typeof p.total        === "number" ? p.total        : null,
    cost:           typeof p.cost         === "number" ? p.cost         : null,
    purchase_price: typeof p.purchasePrice === "number" ? p.purchasePrice : null,
    taxes:          Array.isArray(p.taxes)  ? p.taxes  : [],
    stock:          typeof p.stock        === "number" ? p.stock        : null,
    has_stock:      p.hasStock ?? false,
    tags:           Array.isArray(p.tags)   ? p.tags   : [],
    raw:            p,
    last_synced_at: new Date().toISOString(),
    // commission_* columns intentionally omitted — never overwritten by sync
  };
}

// ─── Batch upsert helper ──────────────────────────────────────────────────────

async function upsertBatched<T extends Record<string, unknown>>(
  db: SupabaseClient,
  table: string,
  rows: T[]
): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await db
      .from(table)
      .upsert(rows.slice(i, i + BATCH), { onConflict: "id" });
    if (error) throw new Error(`${table} upsert failed: ${error.message}`);
  }
}

// ─── Full sync (contacts + invoices) ─────────────────────────────────────────

export async function runFullSync(db: SupabaseClient): Promise<{
  contacts: number;
  invoices: number;
  products: number;
}> {
  const [contacts, invoices, creditNotes, products] = await Promise.all([
    getAllContacts(),
    getAllDocuments("invoice"),
    getAllDocuments("creditnote"),
    getAllProducts(),
  ]);

  const allInvoiceRows = [
    ...invoices.map(d => toInvoiceRow(d, false)),
    ...creditNotes.map(d => toInvoiceRow(d, true)),
  ];

  await Promise.all([
    upsertBatched(db, "holded_contacts", contacts.map(toContactRow)),
    upsertBatched(db, "holded_invoices",  allInvoiceRows),
    upsertBatched(db, "holded_products",  products.map(toProductRow)),
  ]);

  return { contacts: contacts.length, invoices: invoices.length + creditNotes.length, products: products.length };
}

// ─── Status-only sync (invoices, page 1 only — covers recent activity) ───────
// Fetches only the first pages; statuses on older invoices rarely change.
// A full sync runs every 15 min anyway, so this just keeps the first page fresh.

const STATUS_PAGES = 5; // ~500 most recent invoices

export async function runStatusSync(db: SupabaseClient): Promise<{
  invoices: number;
}> {
  const invoices: HoldedDocument[] = [];
  for (let p = 1; p <= STATUS_PAGES; p++) {
    const batch = await getDocuments("invoice", p);
    invoices.push(...batch);
    if (batch.length < 100) break;
  }

  if (invoices.length === 0) return { invoices: 0 };

  const updates = invoices.map((d) => ({
    id:                 d.id,
    status:             computeInvoiceStatus(d),
    total:              docAmount(d),
    due_date:           d.dueDate ? new Date(d.dueDate * 1000).toISOString() : null,
    date_last_modified: d.dateLastModified
                          ? new Date(d.dateLastModified * 1000).toISOString()
                          : null,
    raw:                d,
    last_synced_at:     new Date().toISOString(),
  }));

  await upsertBatched(db, "holded_invoices", updates);

  return { invoices: invoices.length };
}

// ─── Sync log helpers ─────────────────────────────────────────────────────────

export async function logSyncStart(
  db: SupabaseClient,
  type: "full" | "status_only"
): Promise<number> {
  const { data, error } = await db
    .from("holded_sync_log")
    .insert({ sync_type: type, status: "running" })
    .select("id")
    .single();
  if (error) throw new Error(`sync_log insert failed: ${error.message}`);
  return data.id as number;
}

export async function logSyncEnd(
  db: SupabaseClient,
  logId: number,
  counts: { contacts?: number; invoices?: number; products?: number },
  error?: string
): Promise<void> {
  await db
    .from("holded_sync_log")
    .update({
      status:           error ? "failed" : "completed",
      contacts_synced:  counts.contacts ?? 0,
      invoices_synced:  counts.invoices ?? 0,
      products_synced:  counts.products ?? 0,
      error_message:    error ?? null,
      finished_at:      new Date().toISOString(),
    })
    .eq("id", logId);
}
