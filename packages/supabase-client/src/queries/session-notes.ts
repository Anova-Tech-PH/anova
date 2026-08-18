import type { SupabaseClient } from "@supabase/supabase-js";

export async function getMyNotes(
  client: SupabaseClient,
  eventId: string,
  userId: string
) {
  const { data } = await client
    .from("session_notes")
    .select(
      "id, session_id, content, updated_at, sessions(title, start_time, event_id)"
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  // Filter to only notes for sessions in this event
  // Supabase returns joined relations as arrays
  const filtered = (data ?? []).filter(
    (note: any) => {
      const sessions = note.sessions;
      if (Array.isArray(sessions)) return sessions[0]?.event_id === eventId;
      return sessions?.event_id === eventId;
    }
  );

  return filtered;
}

export async function getSessionNote(
  client: SupabaseClient,
  sessionId: string,
  userId: string
) {
  const { data, error } = await client
    .from("session_notes")
    .select("id, content, updated_at")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data;
}
