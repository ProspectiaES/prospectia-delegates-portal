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
