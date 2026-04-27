"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CreateDelegateState {
  error?: string;
}

export async function createDelegate(
  _prev: CreateDelegateState | null,
  formData: FormData
): Promise<CreateDelegateState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "OWNER") return { error: "Sin permisos" };

  const email    = (formData.get("email")     as string)?.trim();
  const fullName = (formData.get("full_name") as string)?.trim();
  const password = (formData.get("password")  as string);

  if (!email || !fullName || !password) return { error: "Todos los campos son obligatorios" };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres" };

  const admin = createAdminClient();

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "DELEGATE" },
  });

  if (authErr) return { error: authErr.message };

  const newUserId = authData.user.id;

  // Upsert profile (the DB trigger may or may not have run yet)
  await admin
    .from("profiles")
    .upsert({ id: newUserId, full_name: fullName, role: "DELEGATE" }, { onConflict: "id" });

  redirect(`/dashboard/delegados/${newUserId}`);
}
