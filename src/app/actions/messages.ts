"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  userId: string;
  full_name: string;
  avatar_url: string | null;
  last_message: string;
  last_at: string;
  unread: number;
}

async function getSessionUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}

export async function sendMessageAction(recipientId: string, content: string): Promise<{ error?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "No autenticado" };
  if (!content.trim()) return { error: "Mensaje vacío" };

  const admin = createAdminClient();
  const { error } = await admin.from("direct_messages").insert({
    sender_id: user.id,
    recipient_id: recipientId,
    content: content.trim(),
  });
  if (error) return { error: error.message };
  return {};
}

export async function getConversationAction(
  otherUserId: string
): Promise<DirectMessage[]> {
  const user = await getSessionUser();
  if (!user) return [];

  const admin = createAdminClient();

  // Mark incoming messages as read
  await admin
    .from("direct_messages")
    .update({ is_read: true })
    .eq("sender_id", otherUserId)
    .eq("recipient_id", user.id)
    .eq("is_read", false);

  const { data } = await admin
    .from("direct_messages")
    .select("id, sender_id, recipient_id, content, is_read, created_at")
    .or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`
    )
    .order("created_at", { ascending: true })
    .limit(100);

  return (data ?? []) as DirectMessage[];
}

export async function getConversationsAction(): Promise<Conversation[]> {
  const user = await getSessionUser();
  if (!user) return [];

  const admin = createAdminClient();

  // Get all messages involving current user
  const { data: msgs } = await admin
    .from("direct_messages")
    .select("id, sender_id, recipient_id, content, is_read, created_at")
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (!msgs || msgs.length === 0) return [];

  // Group by other user
  const byUser: Record<string, { last_message: string; last_at: string; unread: number }> = {};
  for (const m of msgs) {
    const otherId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
    if (!byUser[otherId]) {
      byUser[otherId] = { last_message: m.content, last_at: m.created_at, unread: 0 };
    }
    if (m.recipient_id === user.id && !m.is_read) {
      byUser[otherId].unread += 1;
    }
  }

  const otherIds = Object.keys(byUser);
  if (!otherIds.length) return [];

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", otherIds);

  return (profiles ?? []).map(p => ({
    userId:       p.id,
    full_name:    p.full_name,
    avatar_url:   p.avatar_url,
    last_message: byUser[p.id]?.last_message ?? "",
    last_at:      byUser[p.id]?.last_at ?? "",
    unread:       byUser[p.id]?.unread ?? 0,
  })).sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime());
}

export async function getTotalUnreadMessagesAction(): Promise<number> {
  const user = await getSessionUser();
  if (!user) return 0;
  const admin = createAdminClient();
  const { count } = await admin
    .from("direct_messages")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .eq("is_read", false);
  return count ?? 0;
}

export async function getAllProfilesForChatAction(): Promise<{ id: string; full_name: string; avatar_url: string | null }[]> {
  const user = await getSessionUser();
  if (!user) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, full_name, avatar_url")
    .neq("id", user.id)
    .order("full_name");
  return (data ?? []) as { id: string; full_name: string; avatar_url: string | null }[];
}
