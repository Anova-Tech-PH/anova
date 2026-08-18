import type { SupabaseClient } from "@supabase/supabase-js";

export async function toggleSessionBookmark(
  client: SupabaseClient,
  sessionId: string,
  userId: string,
): Promise<{ bookmarked: boolean }> {
  const { data: existing } = await client
    .from("session_bookmarks")
    .select("user_id")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .single();

  if (existing) {
    await client
      .from("session_bookmarks")
      .delete()
      .eq("user_id", userId)
      .eq("session_id", sessionId);
    return { bookmarked: false };
  } else {
    const { error } = await client
      .from("session_bookmarks")
      .insert({ user_id: userId, session_id: sessionId });
    if (error) throw new Error(error.message);
    return { bookmarked: true };
  }
}
