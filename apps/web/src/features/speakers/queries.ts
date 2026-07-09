import { createClient } from "@/shared/utils/supabase/server";

export async function getSpeakersByEvent(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("speakers")
    .select("*")
    .eq("event_id", eventId)
    .order("name");

  if (error) throw new Error(error.message);
  return data;
}
