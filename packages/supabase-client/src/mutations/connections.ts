import { SupabaseClient } from "@supabase/supabase-js";

export async function sendConnectionRequestMutation(
  client: SupabaseClient,
  requesterId: string,
  receiverId: string,
  eventId: string,
) {
  const { error } = await client
    .from("connections")
    .insert({
      requester_id: requesterId,
      receiver_id: receiverId,
      event_id: eventId,
      status: "pending",
    });

  if (error) {
    if (error.code === "23505") throw new Error("Connection request already sent");
    throw new Error(error.message);
  }
}

export async function respondToConnectionMutation(
  client: SupabaseClient,
  connectionId: string,
  status: "accepted" | "declined",
) {
  const { error } = await client
    .from("connections")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", connectionId);

  if (error) throw new Error(error.message);
}
