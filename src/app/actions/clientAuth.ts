"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientSession, CLIENT_SESSION_COOKIE } from "@/lib/clientSession";

export interface ClientAuthState {
  error?: string;
}

const RATE_LIMIT_MAX_ATTEMPTS = 8;
const RATE_LIMIT_WINDOW_MINUTES = 10;
const GENERIC_ERROR = "NIF/CIF no encontrado o datos incorrectos.";

async function getRequestIp(): Promise<string | null> {
  const hdrs = await headers();
  return hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip") ?? null;
}

function normalizeNif(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function clientLogin(
  _prevState: ClientAuthState | null,
  formData: FormData
): Promise<ClientAuthState> {
  const nif = normalizeNif((formData.get("nif") as string) ?? "");
  if (!nif) return { error: "Introduce tu NIF o CIF." };

  const admin = createAdminClient();
  const ip = await getRequestIp();

  // ── Rate limit: throttle even the lookup step, before touching contacts ───
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60_000).toISOString();
  const { count } = await admin
    .from("client_login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", windowStart);

  if ((count ?? 0) >= RATE_LIMIT_MAX_ATTEMPTS) {
    await admin.from("client_login_attempts").insert({ nif_attempt: nif, ip, success: false });
    return { error: "Demasiados intentos. Prueba de nuevo en unos minutos." };
  }

  // ── Lookup: any non-merged contact with this code, regardless of type ─────
  const { data: matches } = await admin
    .from("holded_contacts")
    .select("id, code")
    .eq("code", nif)
    .is("merged_into_id", null)
    .order("first_synced_at", { ascending: true });

  const rows = matches ?? [];

  if (rows.length === 0) {
    await admin.from("client_login_attempts").insert({ nif_attempt: nif, ip, success: false });
    return { error: GENERIC_ERROR };
  }

  // Two live contacts sharing a NIF is a Holded data-quality bug. Let the
  // oldest-synced record in deterministically rather than refusing access.
  const contact = rows[0];
  if (rows.length > 1) {
    console.warn(`[clientLogin] NIF duplicado en contactos activos: ${nif} (${rows.length} coincidencias, usando ${contact.id})`);
  }

  await admin.from("client_login_attempts").insert({ nif_attempt: nif, ip, success: true, contact_id: contact.id });

  let token: string;
  try {
    token = await createClientSession(contact.id);
  } catch (e) {
    console.error("[clientLogin] No se pudo crear la sesión de cliente:", e);
    return { error: "Error del servidor. Inténtalo de nuevo en unos minutos." };
  }

  const cookieStore = await cookies();
  cookieStore.set(CLIENT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 24 * 60 * 60,
    path: "/",
  });

  redirect("/cliente");
}

export async function clientLogout() {
  const cookieStore = await cookies();
  cookieStore.delete(CLIENT_SESSION_COOKIE);
  redirect("/login");
}
