import type { SupabaseClient } from "@supabase/supabase-js";

export async function getTracksByEvent(client: SupabaseClient, eventId: string) {
  const { data, error } = await client
    .from("tracks")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return data;
}

export async function getSessionsByEvent(client: SupabaseClient, eventId: string) {
  const { data, error } = await client
    .from("sessions")
    .select(`
      *,
      session_tracks(track_id, tracks(id, name, color)),
      session_speakers(speaker_id, speakers(id, name, title, company, photo))
    `)
    .eq("event_id", eventId)
    .order("start_time");

  if (error) throw new Error(error.message);
  return data;
}

export async function getScheduleData(client: SupabaseClient, eventId: string) {
  const [tracks, sessions, event] = await Promise.all([
    client.from("tracks").select("*").eq("event_id", eventId).order("sort_order"),
    client
      .from("sessions")
      .select(`
        *,
        session_tracks(track_id, tracks(id, name, color)),
        session_speakers(speaker_id, speakers(id, name, title, company, photo))
      `)
      .eq("event_id", eventId)
      .order("start_time"),
    client.from("events").select("start_date, end_date, timezone").eq("id", eventId).single(),
  ]);

  if (tracks.error) throw new Error(tracks.error.message);
  if (sessions.error) throw new Error(sessions.error.message);

  return {
    tracks: tracks.data,
    sessions: sessions.data,
    event: event.data,
  };
}
