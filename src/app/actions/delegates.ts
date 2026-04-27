"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SaveDelegatesState {
  error?: string;
  success?: boolean;
}

export async function saveDelegateAssignments(
  _prevState: SaveDelegatesState | null,
  formData: FormData
): Promise<SaveDelegatesState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "OWNER") return { error: "Sin permisos" };

  const contactId   = formData.get("contact_id") as string;
  const delegateIds = formData.getAll("delegate_ids") as string[];

  const admin = createAdminClient();

  const { error: delErr } = await admin
    .from("contact_delegates")
    .delete()
    .eq("contact_id", contactId);

  if (delErr) return { error: `Error al limpiar asignaciones: ${delErr.message}` };

  if (delegateIds.length > 0) {
    const { error: insErr } = await admin
      .from("contact_delegates")
      .insert(delegateIds.map((id) => ({ contact_id: contactId, delegate_id: id })));

    if (insErr) return { error: `Error al guardar asignaciones: ${insErr.message}` };
  }

  revalidatePath(`/dashboard/clientes/${contactId}`);
  return { success: true };
}
