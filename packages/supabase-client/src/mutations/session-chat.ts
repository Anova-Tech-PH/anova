import type { SupabaseClient } from "@supabase/supabase-js";

export async function sendChatMessage(
  client: SupabaseClient,
  params: {
    sessionId: string;
    userId: string;
    content: string;
  }
): Promise<void> {
  const { error } = await client.from("session_chat_messages").insert({
    session_id: params.sessionId,
    user_id: params.userId,
    content: params.content,
  });
  if (error) throw new Error(error.message);
}
