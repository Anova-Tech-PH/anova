import type { SupabaseClient } from "@supabase/supabase-js";

export async function getRoomsByEvent(client: SupabaseClient, eventId: string) {
  const { data, error } = await client
    .from("breakout_rooms")
    .select(`
      *,
      sessions(id, title),
      breakout_room_participants(id, user_id, joined_at)
    `)
    .eq("event_id", eventId)
    .order("starts_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function getRoomById(client: SupabaseClient, roomId: string) {
  const { data, error } = await client
    .from("breakout_rooms")
    .select(`
      *,
      sessions(id, title),
      breakout_room_participants(id, user_id, joined_at)
    `)
    .eq("id", roomId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getMyRooms(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from("breakout_room_participants")
    .select(`
      room_id,
      joined_at,
      breakout_rooms(*)
    `)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return data;
}
