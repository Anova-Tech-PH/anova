import type { SupabaseClient } from "@supabase/supabase-js";

export async function saveSessionNote(
  client: SupabaseClient,
  sessionId: string,
  userId: string,
  content: string,
): Promise<void> {
  const { error } = await client.from("session_notes").upsert(
    {
      session_id: sessionId,
      user_id: userId,
      content,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id,user_id" },
  );
  if (error) throw new Error(error.message);
}

export async function deleteSessionNote(
  client: SupabaseClient,
  sessionId: string,
  userId: string,
): Promise<void> {
  const { error } = await client
    .from("session_notes")
    .delete()
    .eq("session_id", sessionId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
