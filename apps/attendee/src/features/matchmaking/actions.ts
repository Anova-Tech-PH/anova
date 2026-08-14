"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function selectInterest(
  eventId: string,
  interestId: string,
  orgSlug: string,
  eventSlug: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("attendee_interests")
    .insert({ event_id: eventId, user_id: user.id, interest_id: interestId });

  if (error && error.code !== "23505")
    throw new Error(error.message);
  revalidatePath(`/${orgSlug}/${eventSlug}/matchmaking`);
}

export async function deselectInterest(
  eventId: string,
  interestId: string,
  orgSlug: string,
  eventSlug: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("attendee_interests")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .eq("interest_id", interestId);

  if (error) throw new Error(error.message);
  revalidatePath(`/${orgSlug}/${eventSlug}/matchmaking`);
}
