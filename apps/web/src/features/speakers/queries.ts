import { createClient } from "@attendly/ui/supabase/server";

export async function getSpeakersByEvent(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("speakers")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("name");

  if (error) throw new Error(error.message);
  return data;
}

export async function getSpeakerById(speakerId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("speakers")
    .select(
      `*, session_speakers(sessions(id, title, start_time, end_time, location, type, tracks(name, color)))`
    )
    .eq("id", speakerId)
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Speaker not found");
  return data;
}
