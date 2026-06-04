"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Assignar número de tracking MRW a un pedido ─────────────────────────────

export async function setMrwTracking(
  orderId: string,
  trackingNumber: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles").select("role").eq("id", user.id).maybeSingle();

  if (!["OWNER", "ADMIN"].includes(profile?.role ?? "")) {
    return { error: "Sin permisos" };
  }

  const clean = trackingNumber.trim().replace(/\s+/g, "");
  if (!clean) {
    // Allow clearing the tracking number
    const { error } = await admin.from("holded_salesorders")
      .update({ mrw_tracking_number: null, mrw_status: null, mrw_last_event: null })
      .eq("id", orderId);
    if (error) return { error: error.message };
  } else {
    const { error } = await admin.from("holded_salesorders")
      .update({
        mrw_tracking_number: clean,
        mrw_status: "Pendent",
        mrw_last_event: `Tracking MRW assignat: ${clean}`,
        mrw_last_checked_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    if (error) return { error: error.message };
  }

  revalidatePath("/dashboard/pedidos");
  return { success: true };
}

// ─── Marcar manualment com entregat (si l'SMS no s'ha rebut) ─────────────────

export async function markMrwDelivered(
  orderId: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles").select("role").eq("id", user.id).maybeSingle();

  if (!["OWNER", "ADMIN"].includes(profile?.role ?? "")) {
    return { error: "Sin permisos" };
  }

  const now = new Date().toISOString();
  const { error } = await admin.from("holded_salesorders").update({
    shipping_status:     5,
    mrw_status:          "Entregado (manual)",
    mrw_delivered_at:    now,
    mrw_last_event:      "Entregat manualment per l'operador",
    mrw_last_checked_at: now,
  }).eq("id", orderId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/pedidos");
  return { success: true };
}
