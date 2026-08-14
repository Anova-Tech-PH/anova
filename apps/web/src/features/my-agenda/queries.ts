"use server";

import { createClient } from "@attendly/ui/supabase/server";

export async function getMyAgendaSessions(
  eventId: string,
  options: { search?: string } = {}
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Get bookmarked session IDs
  const { data: bookmarks } = await supabase
    .from("session_bookmarks")
    .select("session_id")
    .eq("user_id", user.id);

  const sessionIds = bookmarks?.map((b) => b.session_id) ?? [];
  if (sessionIds.length === 0) return [];

  let query = supabase
    .from("sessions")
    .select(
      "id, title, description, start_time, end_time, location, type, session_speakers(speaker_id, speakers(id, name, title, photo))"
    )
    .eq("event_id", eventId)
    .in("id", sessionIds)
    .order("start_time");

  if (options.search) {
    query = query.ilike("title", `%${options.search}%`);
  }

  const { data } = await query;
  return data ?? [];
}
