import type { SupabaseClient } from "@supabase/supabase-js";

export async function checkInToEvent(
  client: SupabaseClient,
  params: {
    eventId: string;
    registrationId: string;
  },
): Promise<void> {
  const { error } = await client
    .from("check_ins")
    .insert({
      event_id: params.eventId,
      registration_id: params.registrationId,
    });

  if (error) {
    if (error.code === "23505") throw new Error("Already checked in");
    throw new Error(error.message);
  }

  // Update registration status
  await client
    .from("registrations")
    .update({ status: "checked_in" })
    .eq("id", params.registrationId);
}
