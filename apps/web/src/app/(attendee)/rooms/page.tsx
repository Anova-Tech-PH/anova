import { createClient } from "@/shared/utils/supabase/server";
import { RoomBrowser } from "@/features/breakout-rooms/components/room-browser";

export default async function AttendeeRoomsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Get rooms from all events the user is registered for
  const { data: registrations } = await supabase
    .from("registrations")
    .select("event_id")
    .eq("user_id", user?.id ?? "")
    .in("status", ["confirmed", "checked_in"]);

  const eventIds = registrations?.map((r) => r.event_id) ?? [];

  let rooms: any[] = [];
  if (eventIds.length > 0) {
    const { data } = await supabase
      .from("breakout_rooms")
      .select(`
        *,
        sessions(id, title),
        breakout_room_participants(id, user_id)
      `)
      .in("event_id", eventIds)
      .order("starts_at", { ascending: true });

    rooms = data ?? [];
  }

  return <RoomBrowser rooms={rooms} currentUserId={user?.id ?? null} />;
}
