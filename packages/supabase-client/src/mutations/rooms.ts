import type { SupabaseClient } from "@supabase/supabase-js";

export async function joinRoomMutation(
  client: SupabaseClient,
  roomId: string,
  userId: string
) {
  // Check room exists and is open
  const { data: room } = await client
    .from("breakout_rooms")
    .select("id, max_capacity, status, event_id")
    .eq("id", roomId)
    .single();

  if (!room) throw new Error("Room not found");
  if (room.status === "closed") throw new Error("Room is closed");

  // Check capacity
  if (room.max_capacity) {
    const { count } = await client
      .from("breakout_room_participants")
      .select("id", { count: "exact", head: true })
      .eq("room_id", roomId);

    if (count !== null && count >= room.max_capacity) {
      throw new Error("Room is full");
    }
  }

  const { error } = await client
    .from("breakout_room_participants")
    .insert({ room_id: roomId, user_id: userId });

  if (error) {
    if (error.code === "23505") throw new Error("Already joined this room");
    throw new Error(error.message);
  }

  // Auto-update status to full if at capacity
  if (room.max_capacity) {
    const { count } = await client
      .from("breakout_room_participants")
      .select("id", { count: "exact", head: true })
      .eq("room_id", roomId);

    if (count !== null && count >= room.max_capacity) {
      await client
        .from("breakout_rooms")
        .update({ status: "full", updated_at: new Date().toISOString() })
        .eq("id", roomId);
    }
  }

  return room;
}

export async function leaveRoomMutation(
  client: SupabaseClient,
  roomId: string,
  userId: string
) {
  const { data: room } = await client
    .from("breakout_rooms")
    .select("id, event_id, status, max_capacity")
    .eq("id", roomId)
    .single();

  if (!room) throw new Error("Room not found");

  const { error } = await client
    .from("breakout_room_participants")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  // If room was full, reopen it
  if (room.status === "full") {
    await client
      .from("breakout_rooms")
      .update({ status: "open", updated_at: new Date().toISOString() })
      .eq("id", roomId);
  }

  return room;
}
