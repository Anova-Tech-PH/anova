import { notFound } from "next/navigation";
import { createClient } from "@/shared/utils/supabase/server";
import { getRoomsByEvent } from "@/features/breakout-rooms/queries";
import { RoomList } from "@/features/breakout-rooms/components/room-list";

export default async function OrganizerRoomsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  const rooms = await getRoomsByEvent(eventId);

  // Fetch sessions for linking
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, title")
    .eq("event_id", eventId)
    .order("start_time", { ascending: true });

  return <RoomList eventId={eventId} rooms={rooms} sessions={sessions ?? []} />;
}
