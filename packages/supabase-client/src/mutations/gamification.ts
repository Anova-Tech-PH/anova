import type { SupabaseClient } from "@supabase/supabase-js";

export async function collectPassportStamp(
  client: SupabaseClient,
  params: {
    eventId: string;
    userId: string;
    sponsorId: string;
  },
): Promise<void> {
  const { error } = await client
    .from("passport_stamps")
    .insert({
      event_id: params.eventId,
      user_id: params.userId,
      sponsor_id: params.sponsorId,
    });

  if (error) {
    if (error.code === "23505") throw new Error("Stamp already collected");
    throw new Error(error.message);
  }
}
