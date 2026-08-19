import { SupabaseClient } from "@supabase/supabase-js";

export async function getProfile(client: SupabaseClient, userId: string) {
  const { data } = await client
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  return data;
}

export async function getAttendeeContactInfo(
  client: SupabaseClient,
  userId: string,
  eventId: string,
) {
  const { data } = await client
    .from("attendee_profiles")
    .select("phone, contact_email, address, show_phone, show_email, show_address")
    .eq("id", userId)
    .eq("event_id", eventId)
    .maybeSingle();

  return data;
}
