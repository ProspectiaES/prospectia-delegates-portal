"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

async function logAuthEvent(
  userId: string,
  userName: string,
  event: "login" | "logout",
) {
  try {
    const hdrs = await headers();
    const ip   = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip") ?? null;
    const ua   = hdrs.get("user-agent") ?? null;
    const admin = createAdminClient();
    await admin.from("user_activity_logs").insert({
      user_id: userId, user_name: userName, event_type: event,
      path: event === "login" ? "/login" : "/dashboard", ip, user_agent: ua,
    });
  } catch { /* non-blocking */ }
}

export async function login(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email:    formData.get("email")    as string,
    password: formData.get("password") as string,
  });

  if (error) return error.message;

  if (data.user) {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles").select("full_name").eq("id", data.user.id).maybeSingle();
    await logAuthEvent(data.user.id, profile?.full_name ?? data.user.email ?? "Unknown", "login");
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    await logAuthEvent(user.id, profile?.full_name ?? user.email ?? "Unknown", "logout");
  }

  await supabase.auth.signOut();
  redirect("/login");
}
