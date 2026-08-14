"use server";

import { createClient } from "@attendly/ui/supabase/server";

export async function getConversations(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get all messages for this user in this event
  const { data: messages } = await supabase
    .from("direct_messages")
    .select("id, sender_id, recipient_id, content, read_at, created_at")
    .eq("event_id", eventId)
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (!messages || messages.length === 0) return [];

  // Group by the other person in each conversation
  const conversationMap = new Map<
    string,
    {
      otherUserId: string;
      lastMessage: string;
      lastMessageAt: string;
      unreadCount: number;
    }
  >();

  for (const msg of messages) {
    const otherUserId =
      msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
    if (!conversationMap.has(otherUserId)) {
      conversationMap.set(otherUserId, {
        otherUserId,
        lastMessage: msg.content,
        lastMessageAt: msg.created_at,
        unreadCount: 0,
      });
    }
    if (msg.recipient_id === user.id && !msg.read_at) {
      const conv = conversationMap.get(otherUserId)!;
      conv.unreadCount++;
    }
  }

  // Get profiles for all other users
  const otherUserIds = Array.from(conversationMap.keys());
  const { data: profiles } = await supabase
    .from("attendee_profiles")
    .select("id, display_name, avatar_url, title, company")
    .eq("event_id", eventId)
    .in("id", otherUserIds);

  return Array.from(conversationMap.values()).map((conv) => ({
    ...conv,
    profile: profiles?.find((p) => p.id === conv.otherUserId) ?? null,
  }));
}

export async function getConversationMessages(
  eventId: string,
  otherUserId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data } = await supabase
    .from("direct_messages")
    .select("id, sender_id, recipient_id, content, read_at, created_at")
    .eq("event_id", eventId)
    .or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`
    )
    .order("created_at", { ascending: true });

  return data ?? [];
}

export async function getUnreadMessageCount(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("direct_messages")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("recipient_id", user.id)
    .is("read_at", null);

  return count ?? 0;
}
