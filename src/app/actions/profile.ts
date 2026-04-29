"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ProfileUpdateState {
  error?: string;
  success?: boolean;
}

export async function updateProfileData(
  _prev: ProfileUpdateState | null,
  formData: FormData
): Promise<ProfileUpdateState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const fields: Record<string, string | null> = {
    full_name:   (formData.get("full_name")   as string)?.trim() || null,
    phone:       (formData.get("phone")       as string)?.trim() || null,
    email:       (formData.get("email")       as string)?.trim() || null,
    nif:         (formData.get("nif")         as string)?.trim() || null,
    address:     (formData.get("address")     as string)?.trim() || null,
    city:        (formData.get("city")        as string)?.trim() || null,
    postal_code: (formData.get("postal_code") as string)?.trim() || null,
    iban:        (formData.get("iban")        as string)?.trim() || null,
  };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update(fields)
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/perfil");
  return { success: true };
}

export async function updateAvatarUrl(
  _prev: ProfileUpdateState | null,
  formData: FormData
): Promise<ProfileUpdateState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const url = (formData.get("avatar_url") as string)?.trim();
  if (!url) return { error: "URL de avatar vacía" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/perfil");
  revalidatePath("/dashboard");
  return { success: true };
}
