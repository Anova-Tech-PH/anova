import { createClient } from "@/shared/utils/supabase/server";

export async function getTracksByEvent(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return data;
}

export async function getSessionsByEvent(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sessions")
    .select(`
      *,
      track:tracks(id, name, color),
      session_speakers(speaker_id, speakers(id, name, title, company, photo))
    `)
    .eq("event_id", eventId)
    .order("start_time");

  if (error) throw new Error(error.message);
  return data;
}

export async function getScheduleData(eventId: string) {
  const supabase = await createClient();

  const [tracks, sessions, event] = await Promise.all([
    supabase.from("tracks").select("*").eq("event_id", eventId).order("sort_order"),
    supabase
      .from("sessions")
      .select(`
        *,
        track:tracks(id, name, color),
        session_speakers(speaker_id, speakers(id, name, title, company, photo))
      `)
      .eq("event_id", eventId)
      .order("start_time"),
    supabase.from("events").select("start_date, end_date, timezone").eq("id", eventId).single(),
  ]);

  if (tracks.error) throw new Error(tracks.error.message);
  if (sessions.error) throw new Error(sessions.error.message);

  return {
    tracks: tracks.data,
    sessions: sessions.data,
    event: event.data,
  };
}
