"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SaveProfileState {
  error?: string;
  success?: boolean;
}

export async function saveDelegateProfile(
  _prev: SaveProfileState | null,
  formData: FormData
): Promise<SaveProfileState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "OWNER") return { error: "Sin permisos" };

  const delegateId = formData.get("delegate_id") as string;
  if (!delegateId) return { error: "ID de delegado no válido" };

  const str = (key: string): string | null => {
    const v = (formData.get(key) as string | null)?.trim();
    return v || null;
  };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      full_name:   (formData.get("full_name") as string)?.trim() || undefined,
      email:       str("email"),
      phone:       str("phone"),
      nif:         str("nif"),
      address:     str("address"),
      city:        str("city"),
      postal_code: str("postal_code"),
      iban:        str("iban"),
    })
    .eq("id", delegateId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/delegados/${delegateId}`);
  return { success: true };
}
