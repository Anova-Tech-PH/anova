"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";
import { joinRoomMutation, leaveRoomMutation } from "@attendly/supabase-client/mutations/rooms";

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

  const room = await joinRoomMutation(supabase, roomId, user.id);

  revalidatePath(`/events/${room.event_id}/rooms`);
  revalidatePath("/rooms");
}

export async function leaveRoom(roomId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const room = await leaveRoomMutation(supabase, roomId, user.id);

  revalidatePath(`/events/${room.event_id}/rooms`);
  revalidatePath("/rooms");
}
