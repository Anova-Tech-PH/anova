import { createClient } from "@/shared/utils/supabase/server";

export async function getConversations() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get conversations user is a member of
  const { data: memberships } = await supabase
    .from("conversation_members")
    .select("conversation_id, last_read_at")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) return [];

  const convIds = memberships.map((m) => m.conversation_id);
  const lastReadMap: Record<string, string | null> = {};
  for (const m of memberships) {
    lastReadMap[m.conversation_id] = m.last_read_at;
  }

  const { data: conversations } = await supabase
    .from("conversations")
    .select(`
      *,
      conversation_members(user_id, profiles:user_id(full_name, avatar_url))
    `)
    .in("id", convIds)
    .order("updated_at", { ascending: false });

  if (!conversations) return [];

  // Get last message for each conversation
  const result = [];
  for (const conv of conversations) {
    const { data: lastMsg } = await supabase
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
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .neq("sender_id", user.id)
        .gt("created_at", lastRead);
      unreadCount = count ?? 0;
    }

    // Get display name for DMs
    const otherMembers = (conv.conversation_members as any[])
      .filter((m: any) => m.user_id !== user.id);

    result.push({
      ...conv,
      last_message: lastMsg,
      unread_count: unreadCount,
      display_name: conv.is_group
        ? conv.name ?? "Group Chat"
        : otherMembers[0]?.profiles?.full_name ?? "Unknown",
      display_avatar: conv.is_group
        ? null
        : otherMembers[0]?.profiles?.avatar_url ?? null,
    });
  }

  return result;
}

export async function getMessages(conversationId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("messages")
    .select("*, profiles:sender_id(full_name, avatar_url)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) throw new Error(error.message);
  return data;
}
