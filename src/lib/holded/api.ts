import { holdedFetch } from "./client";

// ─── Contacts ────────────────────────────────────────────────────────────────

export interface HoldedContact {
  id: string;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  /** 0=lead  1=client  2=provider  3=creditor  4=debtor — API returns string or number */
  type?: number | string;
  tags?: string[];
  billAddress?: {
    address?: string;
    city?: string;
    postalCode?: string;
    province?: string;
    country?: string;
    countryCode?: string;
  };
  [key: string]: unknown;
}

const CONTACTS_PAGE_SIZE = 100;

export async function getContacts(page = 1): Promise<HoldedContact[]> {
  const data = await holdedFetch<
    HoldedContact[] | { contacts: HoldedContact[] }
  >(`/invoicing/v1/contacts?page=${page}`);
  if (Array.isArray(data)) return data;
  if (data && "contacts" in data) return data.contacts;
  return [];
}

/** Fetches every page until Holded returns an empty or partial batch. */
export async function getAllContacts(): Promise<HoldedContact[]> {
  const all: HoldedContact[] = [];
  let page = 1;
  while (true) {
    const batch = await getContacts(page);
    all.push(...batch);
    if (batch.length < CONTACTS_PAGE_SIZE) break;
    page++;
  }
  return all;
}

// ─── Documents ───────────────────────────────────────────────────────────────

export type DocType =
  | "invoice"
  | "salesorder"
  | "salesreceipt"
  | "estimate"
  | "creditnote"
  | "proform"
  | "purchase"
  | "purchaseorder";

export interface HoldedDocument {
  id: string;
  docNumber?: string;
  contact?: string;
  contactName?: string;
  /** Unix timestamp (seconds) */
  date: number;
  dueDate?: number;
  dateLastModified?: number;
  total?: number;
  amount?: number;
  /** 0=draft  1=pending  2=overdue  3=paid */
  status: number;
  desc?: string;
  notes?: string;
  [key: string]: unknown;
}

const DOCS_PAGE_SIZE = 100;

export async function getDocuments(
  docType: DocType,
  page = 1
): Promise<HoldedDocument[]> {
  const raw = await holdedFetch<
    HoldedDocument[] | { documents: HoldedDocument[] }
  >(`/invoicing/v1/documents/${docType}?page=${page}`);
  if (Array.isArray(raw)) return raw;
  if (raw && "documents" in raw) return raw.documents;
  return [];
}

/** Fetches every page until Holded returns an empty or partial batch. */
export async function getAllDocuments(
  docType: DocType
): Promise<HoldedDocument[]> {
  const all: HoldedDocument[] = [];
  let page = 1;
  while (true) {
    const batch = await getDocuments(docType, page);
    all.push(...batch);
    if (batch.length < DOCS_PAGE_SIZE) break;
    page++;
  }
  return all;
}

// ─── Products ────────────────────────────────────────────────────────────────

export interface HoldedProduct {
  id: string;
  name: string;
  desc?: string;
  sku?: string;
  barcode?: string;
  factoryCode?: string;
  kind?: string;
  price?: number;
  total?: number;
  cost?: number;
  purchasePrice?: number;
  taxes?: string[];
  stock?: number;
  hasStock?: boolean;
  tags?: string[];
  [key: string]: unknown;
}

const PRODUCTS_PAGE_SIZE = 100;

export async function getProducts(page = 1): Promise<HoldedProduct[]> {
  const data = await holdedFetch<HoldedProduct[] | { products: HoldedProduct[] }>(
    `/invoicing/v1/products?page=${page}`
  );
  if (Array.isArray(data)) return data;
  if (data && "products" in data) return data.products;
  return [];
}

export async function getAllProducts(): Promise<HoldedProduct[]> {
  const all: HoldedProduct[] = [];
  let page = 1;
  while (true) {
    const batch = await getProducts(page);
    all.push(...batch);
    if (batch.length < PRODUCTS_PAGE_SIZE) break;
    page++;
  }
  return all;
}

// ─── Payment methods ─────────────────────────────────────────────────────────

export interface HoldedPaymentMethod {
  id: string;
  name: string;
  dueDays: string;
  bankId: string;
}

export async function getPaymentMethods(): Promise<HoldedPaymentMethod[]> {
  const data = await holdedFetch<HoldedPaymentMethod[]>("/invoicing/v1/paymentmethods");
  return Array.isArray(data) ? data : [];
}

// ─── Contact create ───────────────────────────────────────────────────────────

export interface HoldedContactCreatePayload {
  name: string;
  code?: string;       // NIF / CIF
  isperson?: 0 | 1;   // 0 = empresa, 1 = persona física
  email?: string;
  phone?: string;
  mobile?: string;
  /** 'client' | 'provider' | etc. */
  type?: string;
  iban?: string;
  customFields?: { field: string; value: string }[];
  billAddress?: {
    address?: string;
    city?: string;
    postalCode?: string;
    province?: string;
    country?: string;
    countryCode?: string;
  };
  defaults?: {
    paymentMethod?: string;
    language?: string;
    currency?: string;
    discount?: number;
  };
}

export async function createContact(
  payload: HoldedContactCreatePayload
): Promise<{ id: string; status: number }> {
  return holdedFetch<{ id: string; status: number }>("/invoicing/v1/contacts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Sales order create ───────────────────────────────────────────────────────

export interface HoldedOrderLine {
  productId?: string;
  name: string;
  units: number;
  price: number;
  discount?: number;
  taxes?: string[];
}

export interface HoldedSalesOrderPayload {
  contactId: string;
  contactName?: string;
  date: number;       // Unix timestamp (seconds)
  currency?: string;
  language?: string;
  notes?: string;
  products: HoldedOrderLine[];
}

export async function createSalesOrder(
  payload: HoldedSalesOrderPayload
): Promise<{ id: string; status: number }> {
  return holdedFetch<{ id: string; status: number }>(
    "/invoicing/v1/documents/salesorder",
    { method: "POST", body: JSON.stringify(payload) }
  );
}

// ─── Contact mutations ───────────────────────────────────────────────────────

export interface HoldedContactUpdatePayload {
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  type?: number;
  tags?: string[];
  billAddress?: {
    address?: string;
    city?: string;
    postalCode?: string;
    province?: string;
    country?: string;
    countryCode?: string;
  };
}

export async function updateContact(
  id: string,
  payload: HoldedContactUpdatePayload
): Promise<void> {
  await holdedFetch<unknown>(`/invoicing/v1/contacts/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function docAmount(doc: HoldedDocument): number {
  return doc.total ?? doc.amount ?? 0;
}

export function docDate(doc: HoldedDocument): Date {
  return new Date(doc.date * 1000);
}

export function docStatus(status: number): {
  label: string;
  variant: "success" | "warning" | "danger" | "neutral";
} {
  switch (status) {
    case 3:  return { label: "Cobrada",   variant: "success" };
    case 2:  return { label: "Vencida",   variant: "danger"  };
    case 1:  return { label: "Pendiente", variant: "warning" };
    default: return { label: "Borrador",  variant: "neutral" };
  }
}

export function orderStatus(status: number): {
  label: string;
  variant: "success" | "warning" | "danger" | "neutral";
} {
  switch (status) {
    case 3:  return { label: "Facturado",  variant: "success" };
    case 2:  return { label: "Aprobado",   variant: "success" };
    case 1:  return { label: "Pendiente",  variant: "warning" };
    default: return { label: "Borrador",   variant: "neutral" };
  }
}
