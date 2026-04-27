"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateContact } from "@/lib/holded/api";

export interface UpdateContactState {
  error?: string;
  success?: boolean;
}

export async function updateContactAction(
  _prevState: UpdateContactState | null,
  formData: FormData
): Promise<UpdateContactState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const id = formData.get("id") as string;
  if (!id) return { error: "ID de contacto no encontrado" };

  const name = (formData.get("name") as string ?? "").trim();
  if (!name) return { error: "El nombre es obligatorio" };

  const tagsRaw = (formData.get("tags") as string ?? "").trim();
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

  const typeStr = formData.get("type") as string;
  const type = typeStr !== "" ? parseInt(typeStr, 10) : undefined;

  const payload = {
    name,
    code:   (formData.get("code")   as string) || undefined,
    email:  (formData.get("email")  as string) || undefined,
    phone:  (formData.get("phone")  as string) || undefined,
    mobile: (formData.get("mobile") as string) || undefined,
    type,
    tags,
    billAddress: {
      address:    (formData.get("address")     as string) || undefined,
      city:       (formData.get("city")        as string) || undefined,
      postalCode: (formData.get("postal_code") as string) || undefined,
      province:   (formData.get("province")    as string) || undefined,
      country:    (formData.get("country")     as string) || undefined,
    },
  };

  try {
    await updateContact(id, payload);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al actualizar en Holded" };
  }

  const admin = createAdminClient();
  const { error: dbErr } = await admin.from("holded_contacts").update({
    name:        payload.name,
    code:        payload.code        ?? null,
    email:       payload.email       ?? null,
    phone:       payload.phone       ?? null,
    mobile:      payload.mobile      ?? null,
    type:        payload.type        ?? null,
    tags:        payload.tags        ?? [],
    address:     payload.billAddress?.address    ?? null,
    city:        payload.billAddress?.city       ?? null,
    postal_code: payload.billAddress?.postalCode ?? null,
    province:    payload.billAddress?.province   ?? null,
    country:     payload.billAddress?.country    ?? null,
    last_synced_at: new Date().toISOString(),
  }).eq("id", id);

  if (dbErr) {
    return { error: `Holded actualizado, pero error al sincronizar BD: ${dbErr.message}` };
  }

  revalidatePath(`/dashboard/clientes/${id}`);
  revalidatePath("/dashboard/clientes");

  return { success: true };
}
