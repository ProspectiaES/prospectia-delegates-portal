"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return data?.role === "OWNER";
}

// ─── Configuració global ──────────────────────────────────────────────────────

export async function saveConfig(formData: FormData): Promise<{ error?: string }> {
  if (!await requireOwner()) return { error: "Sin permisos" };
  const admin = createAdminClient();
  const { error } = await admin.from("price_config").update({
    margen_tienda_pct:       parseFloat(formData.get("margen_tienda_pct") as string),
    margen_distribuidor_pct: parseFloat(formData.get("margen_distribuidor_pct") as string),
    iva_pct:                 parseFloat(formData.get("iva_pct") as string),
    units_per_lot:           parseInt(formData.get("units_per_lot") as string),
    updated_at:              new Date().toISOString(),
  }).eq("id", 1);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/preus");
  return {};
}

// ─── Landing costs ────────────────────────────────────────────────────────────

export async function saveLandingCost(formData: FormData): Promise<{ error?: string }> {
  if (!await requireOwner()) return { error: "Sin permisos" };
  const admin = createAdminClient();
  const id      = formData.get("id");
  const payload = {
    concept:     (formData.get("concept") as string).trim(),
    amount:      parseFloat(formData.get("amount") as string),
    is_per_unit: formData.get("is_per_unit") === "true",
    notes:       (formData.get("notes") as string | null) || null,
  };
  let error;
  if (id) {
    ({ error } = await admin.from("price_landing_costs").update(payload).eq("id", Number(id)));
  } else {
    const maxRes = await admin.from("price_landing_costs").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const nextSort = ((maxRes.data?.sort_order ?? 0) as number) + 10;
    ({ error } = await admin.from("price_landing_costs").insert({ ...payload, sort_order: nextSort }));
  }
  if (error) return { error: error.message };
  revalidatePath("/dashboard/preus");
  return {};
}

export async function deleteLandingCost(id: number): Promise<{ error?: string }> {
  if (!await requireOwner()) return { error: "Sin permisos" };
  const admin = createAdminClient();
  const { error } = await admin.from("price_landing_costs").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/preus");
  return {};
}

// ─── Product PVPs ─────────────────────────────────────────────────────────────

export async function saveProductPrice(
  productId: string,
  pvpSinIva: number | null,
  purchaseCostOverride: number | null,
  landingCostOverride: number | null
): Promise<{ error?: string }> {
  if (!await requireOwner()) return { error: "Sin permisos" };
  const admin = createAdminClient();
  const { error } = await admin.from("product_prices").upsert(
    {
      product_id:             productId,
      pvp_sin_iva:            pvpSinIva,
      purchase_cost_override: purchaseCostOverride,
      landing_cost_override:  landingCostOverride,
      updated_at:             new Date().toISOString(),
    },
    { onConflict: "product_id" }
  );
  if (error) return { error: error.message };
  revalidatePath("/dashboard/preus");
  return {};
}
