import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface UserProfile {
  id: string;
  full_name: string;
  role: "OWNER" | "ADMIN" | "DELEGATE" | "KOL" | "COORDINATOR" | "COM6";
  is_kol: boolean;
  is_coordinator: boolean;
  created_at: string;
}

export const getProfile = cache(async (): Promise<UserProfile | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_kol, is_coordinator, created_at")
    .eq("id", user.id)
    .maybeSingle();
  return data as UserProfile | null;
});

export function isKolUser(profile: UserProfile | null): boolean {
  return !!(profile?.is_kol || profile?.role === "KOL");
}
