import { createClient } from "@attendly/ui/supabase/server";
import {
  getRoomsByEvent as _getRoomsByEvent,
  getRoomById as _getRoomById,
  getMyRooms as _getMyRooms,
} from "@attendly/supabase-client/queries/rooms";

export async function getRoomsByEvent(eventId: string) {
  const supabase = await createClient();
  return _getRoomsByEvent(supabase, eventId);
}

export async function getRoomById(roomId: string) {
  const supabase = await createClient();
  return _getRoomById(supabase, roomId);
}

export async function getMyRooms(userId: string) {
  const supabase = await createClient();
  return _getMyRooms(supabase, userId);
}
