import type { SupabaseClient } from "@supabase/supabase-js";

export async function getSessionChat(
  client: SupabaseClient,
  sessionId: string
) {
  const { data, error } = await client
    .from("session_chat_messages")
    .select("id, session_id, user_id, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) throw new Error(error.message);

  const messages = data ?? [];
  if (messages.length === 0) return [];

  // Fetch author profiles
  const authorIds = [...new Set(messages.map((m) => m.user_id))];
  const { data: profiles } = await client
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", authorIds);

  const profileMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
  for (const p of profiles ?? []) {
    profileMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
  }

  return messages.map((m) => ({
    ...m,
    profile: profileMap[m.user_id] ?? { full_name: "Unknown", avatar_url: null },
  }));
}
