import { headers } from "next/headers";
import { Sidebar } from "@/components/Sidebar";
import { MobileDrawer } from "@/components/MobileDrawer";
import { ActivityTracker } from "@/components/ActivityTracker";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function isMobileUA(ua: string) {
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(ua);
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  const mobile = isMobileUA(ua);

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

  if (mobile) {
    return (
      <MobileDrawer user={userProfile}>
        {children}
        <ActivityTracker />
      </MobileDrawer>
    );
  }

  return (
    <div className="flex h-full">
      <Sidebar user={userProfile} />
      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-[#F5F5F7]">
        {children}
      </main>
      <ActivityTracker />
    </div>
  );
}
