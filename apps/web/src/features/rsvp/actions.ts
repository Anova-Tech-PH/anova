"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function rsvpToSession(sessionId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("rsvp_to_session", {
    _session_id: sessionId,
  });

  if (error) throw new Error(error.message);
  return data as string; // returns 'confirmed' or 'waitlisted'
}

export async function cancelRsvp(sessionId: string) {
  const supabase = await createClient();

  const { error } = await supabase.rpc("cancel_session_rsvp", {
    _session_id: sessionId,
  });

  if (error) throw new Error(error.message);
}

export async function updateSessionCapacity(
  eventId: string,
  sessionId: string,
  data: { capacity: number | null; rsvp_enabled: boolean }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("sessions")
    .update({
      capacity: data.capacity,
      rsvp_enabled: data.rsvp_enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/schedule`);
}
