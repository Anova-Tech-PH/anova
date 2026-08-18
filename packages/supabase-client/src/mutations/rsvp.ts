import type { SupabaseClient } from "@supabase/supabase-js";

export async function rsvpToSession(
  client: SupabaseClient,
  sessionId: string,
): Promise<string> {
  const { data, error } = await client.rpc("rsvp_to_session", {
    _session_id: sessionId,
  });

  if (error) throw new Error(error.message);
  return data as string;
}

export async function cancelRsvp(
  client: SupabaseClient,
  sessionId: string,
): Promise<void> {
  const { error } = await client.rpc("cancel_session_rsvp", {
    _session_id: sessionId,
  });

  if (error) throw new Error(error.message);
}
