import { createClient } from "@/shared/utils/supabase/server";

export async function getRoomsByEvent(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
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

export async function getRoomById(roomId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
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

export async function getMyRooms(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
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
