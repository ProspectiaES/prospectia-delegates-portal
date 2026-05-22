import { headers } from "next/headers";
import { Sidebar } from "@/components/Sidebar";
import { MobileDrawer } from "@/components/MobileDrawer";
import { ActivityTracker } from "@/components/ActivityTracker";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationItem } from "@/components/NotificationBell";
import { ChatWidget } from "@/components/ChatWidget";
import { ProsperoWidget } from "@/components/ProsperoWidget";
import { getTotalUnreadMessagesAction } from "@/app/actions/messages";

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
  let notifications: NotificationItem[] = [];
  let unreadMessages = 0;

  if (user) {
    const admin = createAdminClient();
    const [profileRes, notifRes, unreadMsgCount] = await Promise.all([
      admin
        .from("profiles")
        .select("id, full_name, role, avatar_url, created_at, is_kol, is_coordinator")
        .eq("id", user.id)
        .maybeSingle(),
      admin
        .from("task_notifications")
        .select(`id, type, is_read, created_at, task:tasks(id, title), actor:profiles!task_notifications_actor_id_fkey(full_name)`)
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      getTotalUnreadMessagesAction(),
    ]);
    userProfile = profileRes.data ?? null;
    unreadMessages = unreadMsgCount;
    const rawNotifs = (notifRes.data ?? []) as unknown as Array<{
      id: string; type: string; is_read: boolean; created_at: string;
      task: { id: string; title: string } | Array<{ id: string; title: string }> | null;
      actor: { full_name: string } | Array<{ full_name: string }> | null;
    }>;
    notifications = rawNotifs.map(n => ({
      id:         n.id,
      type:       n.type as NotificationItem["type"],
      is_read:    n.is_read,
      created_at: n.created_at,
      task:       Array.isArray(n.task)  ? (n.task[0]  ?? null) : (n.task  ?? null),
      actor:      Array.isArray(n.actor) ? (n.actor[0] ?? null) : (n.actor ?? null),
    }));
  }

  if (mobile) {
    return (
      <MobileDrawer user={userProfile} notifications={notifications}>
        {children}
        <ActivityTracker />
        {user && (
          <>
            <ChatWidget currentUserId={user.id} initialUnread={unreadMessages} />
            <ProsperoWidget userRole={userProfile?.role ?? "DELEGATE"} />
          </>
        )}
      </MobileDrawer>
    );
  }

  return (
    <div className="flex h-full">
      <Sidebar user={userProfile} notifications={notifications} initialUnread={unreadMessages} />
      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-[#F5F5F7]">
        {children}
      </main>
      <ActivityTracker />
      {user && (
        <>
          <ChatWidget currentUserId={user.id} initialUnread={unreadMessages} />
          <ProsperoWidget userRole={userProfile?.role ?? "DELEGATE"} />
        </>
      )}
    </div>
  );
}
