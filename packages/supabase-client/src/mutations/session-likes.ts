import type { SupabaseClient } from "@supabase/supabase-js";

export async function toggleSessionLike(
  client: SupabaseClient,
  sessionId: string,
  userId: string
): Promise<{ liked: boolean }> {
  const { data: existing } = await client
    .from("session_likes")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    await client.from("session_likes").delete().eq("id", existing.id);
    return { liked: false };
  } else {
    await client.from("session_likes").insert({
      session_id: sessionId,
      user_id: userId,
    });
    return { liked: true };
  }
}
