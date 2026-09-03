import { cache } from "react";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

// Stateless, signed session for the NIF/CIF client-portal login — deliberately
// NOT a Supabase Auth session (a NIF has no auth.users identity). HMAC via
// Web Crypto so this works identically in the Edge runtime (src/proxy.ts)
// and in Node (server actions/components) with no extra dependency.

export const CLIENT_SESSION_COOKIE = "viho_cliente_session";
const SESSION_DURATION_SECONDS = 60 * 24 * 60 * 60; // 60 days, fixed (not rolling)

export interface ClientSessionPayload {
  contactId: string;
  iat: number;
  exp: number;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(s.length + ((4 - (s.length % 4)) % 4), "=");
  const str = atob(padded);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

async function getHmacKey(): Promise<CryptoKey> {
  const secret = process.env.CLIENT_SESSION_SECRET;
  if (!secret) throw new Error("CLIENT_SESSION_SECRET no está configurado");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createClientSession(contactId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: ClientSessionPayload = { contactId, iat: now, exp: now + SESSION_DURATION_SECONDS };
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await getHmacKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  const sigB64 = base64UrlEncode(new Uint8Array(signature));
  return `${payloadB64}.${sigB64}`;
}

export async function verifyClientSession(cookieValue: string | undefined | null): Promise<ClientSessionPayload | null> {
  if (!cookieValue) return null;
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;

  let key: CryptoKey;
  try {
    key = await getHmacKey();
  } catch {
    return null;
  }

  let signatureBytes: Uint8Array;
  let payloadBytes: Uint8Array;
  try {
    signatureBytes = base64UrlDecode(sigB64);
    payloadBytes = base64UrlDecode(payloadB64);
  } catch {
    return null;
  }

  const valid = await crypto.subtle.verify("HMAC", key, signatureBytes as BufferSource, new TextEncoder().encode(payloadB64));
  if (!valid) return null;

  let payload: ClientSessionPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    return null;
  }

  if (typeof payload.contactId !== "string" || typeof payload.exp !== "number") return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}

export interface ClientContact {
  id: string;
  name: string;
  code: string | null;
  has_recargo_equivalencia: boolean;
}

// Per-request-deduped lookup of "who is this client" — the single source
// every /cliente/* page and client server action should use to get contactId.
export const getClientContact = cache(async (): Promise<ClientContact | null> => {
  const cookieStore = await cookies();
  const session = await verifyClientSession(cookieStore.get(CLIENT_SESSION_COOKIE)?.value);
  if (!session) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("holded_contacts")
    .select("id, name, code, has_recargo_equivalencia")
    .eq("id", session.contactId)
    .is("merged_into_id", null)
    .maybeSingle();

  return data as ClientContact | null;
});
