import { SupabaseClient } from "@supabase/supabase-js";

export async function getEventAttendees(client: SupabaseClient, eventId: string) {
  const { data: registrations } = await client
    .from("registrations")
    .select("user_id")
    .eq("event_id", eventId)
    .in("status", ["confirmed", "checked_in"])
    .not("user_id", "is", null);

  const userIds = registrations?.map((r) => r.user_id).filter(Boolean) as string[] ?? [];
  if (userIds.length === 0) return [];

  const { data: profiles } = await client
    .from("profiles")
    .select("*")
    .in("id", userIds)
    .order("full_name");

  return profiles ?? [];
}

export async function getConnectionsForEvent(
  client: SupabaseClient,
  userId: string,
  eventId: string,
) {
  const { data: sent } = await client
    .from("connections")
    .select("id, receiver_id, status")
    .eq("requester_id", userId)
    .eq("event_id", eventId);

  const { data: received } = await client
    .from("connections")
    .select("id, requester_id, status")
    .eq("receiver_id", userId)
    .eq("event_id", eventId);

  return { sent: sent ?? [], received: received ?? [] };
}
