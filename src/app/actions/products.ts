"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SaveCommissionsState {
  error?: string;
  success?: boolean;
}

const COMMISSION_KEYS = [
  "commission_delegate",
  "commission_recommender",
  "commission_affiliate",
  "commission_4",
  "commission_5",
  "commission_6",
] as const;

export async function saveProductCommissions(
  _prev: SaveCommissionsState | null,
  formData: FormData
): Promise<SaveCommissionsState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "OWNER") return { error: "Sin permisos" };

  const productId = formData.get("product_id") as string;

  const parseRate = (key: string): number | null => {
    const v = (formData.get(key) as string)?.trim();
    if (!v) return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  };

  const updates: Record<string, number | null> = {};
  for (const key of COMMISSION_KEYS) updates[key] = parseRate(key);

  const admin = createAdminClient();
  const { error } = await admin
    .from("holded_products")
    .update(updates)
    .eq("id", productId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/productos/${productId}`);
  revalidatePath("/dashboard/productos");
  return { success: true };
}
