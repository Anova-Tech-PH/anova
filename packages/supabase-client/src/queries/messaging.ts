import { SupabaseClient } from "@supabase/supabase-js";

export async function getConversations(client: SupabaseClient, userId: string) {
  // Get conversations user is a member of
  const { data: memberships } = await client
    .from("conversation_members")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId);

  if (!memberships || memberships.length === 0) return [];

  const convIds = memberships.map((m) => m.conversation_id);
  const lastReadMap: Record<string, string | null> = {};
  for (const m of memberships) {
    lastReadMap[m.conversation_id] = m.last_read_at;
  }

  const { data: conversations } = await client
    .from("conversations")
    .select(`
      *,
      conversation_members(user_id)
    `)
    .in("id", convIds)
    .order("updated_at", { ascending: false });

  if (!conversations) return [];

  // Collect all member user IDs and fetch profiles
  const allMemberIds = new Set<string>();
  for (const conv of conversations) {
    for (const m of (conv.conversation_members as any[])) {
      allMemberIds.add(m.user_id);
    }
  }

  const { data: profiles } = await client
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", Array.from(allMemberIds));

  const profileMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
  for (const p of profiles ?? []) {
    profileMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
  }

  const result = [];
  for (const conv of conversations) {
    const { data: lastMsg } = await client
      .from("messages")
      .select("content, created_at, sender_id")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Count unread messages
    const lastRead = lastReadMap[conv.id];
    let unreadCount = 0;
    if (lastRead) {
      const { count } = await client
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .neq("sender_id", userId)
        .gt("created_at", lastRead);
      unreadCount = count ?? 0;
    }

    // Get display name for DMs
    const otherMembers = (conv.conversation_members as any[])
      .filter((m: any) => m.user_id !== userId);
    const otherProfile = otherMembers[0] ? profileMap[otherMembers[0].user_id] : null;

    result.push({
      ...conv,
      last_message: lastMsg,
      unread_count: unreadCount,
      display_name: conv.is_group
        ? conv.name ?? "Group Chat"
        : otherProfile?.full_name ?? "Unknown",
      display_avatar: conv.is_group
        ? null
        : otherProfile?.avatar_url ?? null,
    });
  }

  return result;
}

export async function getMessages(client: SupabaseClient, conversationId: string) {
  const { data: messages, error } = await client
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) throw new Error(error.message);
  if (!messages || messages.length === 0) return [];

  // Fetch sender profiles
  const senderIds = [...new Set(messages.map((m) => m.sender_id))];
  const { data: profiles } = await client
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", senderIds);

  const profileMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
  for (const p of profiles ?? []) {
    profileMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
  }

  return messages.map((msg) => ({
    ...msg,
    profiles: profileMap[msg.sender_id] ?? null,
  }));
}
