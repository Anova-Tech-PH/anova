"use server";

import { createClient } from "@attendly/ui/supabase/server";

export async function getMyNotes(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("session_notes")
    .select(
      "id, session_id, content, updated_at, sessions(title, start_time, event_id)"
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  // Filter to only notes for sessions in this event
  const filtered = (data ?? []).filter(
    (note: any) => note.sessions?.event_id === eventId
  );

  return filtered;
}

export async function getSessionNote(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("session_notes")
    .select("id, content, updated_at")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .single();

  return data;
}
