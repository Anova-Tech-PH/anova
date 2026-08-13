import { createClient } from "@attendly/ui/supabase/server";

export async function getSpeakerFormSettings(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("speaker_form_settings")
    .select("*")
    .eq("event_id", eventId)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw new Error(error.message);
  return data;
}

export async function getSpeakerFormFields(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("speaker_form_fields")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return data;
}
