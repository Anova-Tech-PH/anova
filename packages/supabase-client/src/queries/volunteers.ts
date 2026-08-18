import type { SupabaseClient } from "@supabase/supabase-js";

export async function getVolunteerSettings(client: SupabaseClient, eventId: string) {
  const { data, error } = await client
    .from("volunteer_settings")
    .select("*")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function getPublicVolunteerInfo(client: SupabaseClient, eventId: string) {
  const [settingsResult, rolesResult, questionsResult, eventResult] = await Promise.all([
    client.from("volunteer_settings").select("*").eq("event_id", eventId).eq("is_published", true).maybeSingle(),
    client.from("volunteer_roles").select("*").eq("event_id", eventId).order("sort_order"),
    client.from("volunteer_questions").select("*").eq("event_id", eventId).order("sort_order"),
    client.from("events").select("start_date, end_date").eq("id", eventId).single(),
  ]);

  if (!settingsResult.data || !eventResult.data) return null;

  return {
    settings: settingsResult.data,
    roles: rolesResult.data ?? [],
    questions: questionsResult.data ?? [],
    eventDates: eventResult.data,
  };
}
