"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CostLineState {
  error?: string;
  success?: boolean;
}

async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.role === "OWNER" ? true : null;
}

function str(formData: FormData, key: string): string | null {
  const v = (formData.get(key) as string | null)?.trim();
  return v || null;
}

export async function saveCostLine(
  _prev: CostLineState | null,
  formData: FormData
): Promise<CostLineState> {
  if (!(await requireOwner())) return { error: "Sense permisos" };

  const id = str(formData, "id");
  const concept   = str(formData, "concept");
  const category  = str(formData, "category") ?? "altres";
  const amountRaw = parseFloat((formData.get("amount") as string) ?? "0");
  const frequency = str(formData, "frequency") ?? "mensual";
  const startsAt  = str(formData, "starts_at");
  const endsAt    = str(formData, "ends_at");
  const status    = str(formData, "status") ?? "actiu";
  const notes     = str(formData, "notes");

  if (!concept) return { error: "El concepte és obligatori" };
  if (isNaN(amountRaw) || amountRaw < 0) return { error: "Import no vàlid" };

  const payload = { concept, category, amount: amountRaw, frequency, starts_at: startsAt, ends_at: endsAt, status, notes };

  const admin = createAdminClient();
  let error;
  if (id) {
    ({ error } = await admin.from("budget_cost_lines").update(payload).eq("id", Number(id)));
  } else {
    ({ error } = await admin.from("budget_cost_lines").insert(payload));
  }

  if (error) return { error: error.message };
  revalidatePath("/dashboard/pressupost");
  return { success: true };
}

export async function deleteCostLine(id: number): Promise<CostLineState> {
  if (!(await requireOwner())) return { error: "Sense permisos" };

  const admin = createAdminClient();
  const { error } = await admin.from("budget_cost_lines").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/pressupost");
  return { success: true };
}
