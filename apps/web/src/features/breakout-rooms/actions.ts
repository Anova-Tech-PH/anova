"use server";

import { createClient } from "@/shared/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function createRoom(eventId: string, data: {
  title: string;
  description?: string;
  facilitator_name?: string;
  location?: string;
  max_capacity?: number | null;
  starts_at: string;
  ends_at: string;
  session_id?: string | null;
}) {
  const supabase = await createClient();

  const { data: room, error } = await supabase
    .from("breakout_rooms")
    .insert({
      event_id: eventId,
      title: data.title,
      description: data.description || null,
      facilitator_name: data.facilitator_name || null,
      location: data.location || null,
      max_capacity: data.max_capacity ?? null,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
      session_id: data.session_id ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/rooms`);
  return room;
}

export async function updateRoom(eventId: string, roomId: string, data: {
  title?: string;
  description?: string | null;
  facilitator_name?: string | null;
  location?: string | null;
  max_capacity?: number | null;
  starts_at?: string;
  ends_at?: string;
  session_id?: string | null;
  status?: string;
}) {
  const supabase = await createClient();

  if (data.status) {
    const valid = ["open", "full", "closed"];
    if (!valid.includes(data.status)) {
      throw new Error(`Invalid status: ${data.status}`);
    }
  }

  const { error } = await supabase
    .from("breakout_rooms")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", roomId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/rooms`);
}

export async function deleteRoom(eventId: string, roomId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("breakout_rooms")
    .delete()
    .eq("id", roomId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/rooms`);
}

export async function joinRoom(roomId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  // Check room exists and is open
  const { data: room } = await supabase
    .from("breakout_rooms")
    .select("id, max_capacity, status, event_id")
    .eq("id", roomId)
    .single();

  if (!room) throw new Error("Room not found");
  if (room.status === "closed") throw new Error("Room is closed");

  // Check capacity
  if (room.max_capacity) {
    const { count } = await supabase
      .from("breakout_room_participants")
      .select("id", { count: "exact", head: true })
      .eq("room_id", roomId);

    if (count !== null && count >= room.max_capacity) {
      throw new Error("Room is full");
    }
  }

  const { error } = await supabase
    .from("breakout_room_participants")
    .insert({ room_id: roomId, user_id: user.id });

  if (error) {
    if (error.code === "23505") throw new Error("Already joined this room");
    throw new Error(error.message);
  }

  // Auto-update status to full if at capacity
  if (room.max_capacity) {
    const { count } = await supabase
      .from("breakout_room_participants")
      .select("id", { count: "exact", head: true })
      .eq("room_id", roomId);

    if (count !== null && count >= room.max_capacity) {
      await supabase
        .from("breakout_rooms")
        .update({ status: "full", updated_at: new Date().toISOString() })
        .eq("id", roomId);
    }
  }

  revalidatePath(`/events/${room.event_id}/rooms`);
  revalidatePath("/rooms");
}

export async function leaveRoom(roomId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: room } = await supabase
    .from("breakout_rooms")
    .select("id, event_id, status, max_capacity")
    .eq("id", roomId)
    .single();

  if (!room) throw new Error("Room not found");

  const { error } = await supabase
    .from("breakout_room_participants")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  // If room was full, reopen it
  if (room.status === "full") {
    await supabase
      .from("breakout_rooms")
      .update({ status: "open", updated_at: new Date().toISOString() })
      .eq("id", roomId);
  }

  revalidatePath(`/events/${room.event_id}/rooms`);
  revalidatePath("/rooms");
}
