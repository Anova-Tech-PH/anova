import { createClient } from "@attendly/ui/supabase/server";

export async function validateTokenAndGetContext(token: string) {
  const supabase = await createClient();

  const { data: tokenData, error: tokenError } = await supabase
    .from("speaker_form_tokens")
    .select("speaker_id, event_id, expires_at, speakers(*), events(id, title)")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (tokenError || !tokenData) return null;

  const { data: fields, error: fieldsError } = await supabase
    .from("speaker_form_fields")
    .select("*")
    .eq("event_id", tokenData.event_id)
    .eq("included", true)
    .order("sort_order");

  if (fieldsError) return null;

  return {
    speaker: tokenData.speakers,
    event: tokenData.events,
    fields: fields ?? [],
  };
}
