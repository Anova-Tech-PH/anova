import type { SupabaseClient } from "@supabase/supabase-js";

export async function getMyAgendaSessions(
  client: SupabaseClient,
  eventId: string,
  userId: string,
  options: { search?: string } = {},
) {
  const { data: bookmarks } = await client
    .from("session_bookmarks")
    .select("session_id")
    .eq("user_id", userId);

  const sessionIds = bookmarks?.map((b: any) => b.session_id) ?? [];
  if (sessionIds.length === 0) return [];

  let query = client
    .from("sessions")
    .select("id, title, description, start_time, end_time, location, type, session_speakers(speaker_id, speakers(id, name, title, photo))")
    .eq("event_id", eventId)
    .in("id", sessionIds)
    .order("start_time");

  if (options.search) {
    query = query.ilike("title", `%${options.search}%`);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getUserBookmarks(client: SupabaseClient, userId: string) {
  const { data } = await client
    .from("session_bookmarks")
    .select("session_id")
    .eq("user_id", userId);

  return (data ?? []).map((b: any) => b.session_id as string);
}
