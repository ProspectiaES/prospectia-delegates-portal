import { Sidebar } from "@/components/Sidebar";
import { ActivityTracker } from "@/components/ActivityTracker";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userProfile: { id: string; full_name: string; role: string; avatar_url: string | null; created_at: string; is_kol: boolean; is_coordinator: boolean } | null = null;

  if (user) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("id, full_name, role, avatar_url, created_at, is_kol, is_coordinator")
      .eq("id", user.id)
      .maybeSingle();
    userProfile = data ?? null;
  }

  return (
    <div className="flex h-full">
      <Sidebar user={userProfile} />
      <main className="flex-1 overflow-y-auto bg-[#F5F5F7]">
        {children}
      </main>
      <ActivityTracker />
    </div>
  );
}
