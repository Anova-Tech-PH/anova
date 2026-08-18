import type { SupabaseClient } from "@supabase/supabase-js";

export async function getSessionLikeStatus(
  client: SupabaseClient,
  sessionId: string,
  userId: string
): Promise<{ liked: boolean; count: number }> {
  const [likeResult, countResult] = await Promise.all([
    client
      .from("session_likes")
      .select("id")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .single(),
    client
      .from("session_likes")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId),
  ]);

  return {
    liked: !!likeResult.data,
    count: countResult.count ?? 0,
  };
}
