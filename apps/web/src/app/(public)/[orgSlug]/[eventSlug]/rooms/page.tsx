import { notFound } from "next/navigation";
import { createClient } from "@/shared/utils/supabase/server";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";

export default async function PublicRoomsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  if (!org) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("organization_id", org.id)
    .eq("slug", eventSlug)
    .eq("status", "published")
    .single();

  if (!event) notFound();

  const { data: rooms } = await supabase
    .from("breakout_rooms")
    .select(`
      id, title, description, facilitator_name, location,
      max_capacity, starts_at, ends_at, status,
      sessions(id, title),
      breakout_room_participants(id)
    `)
    .eq("event_id", event.id)
    .order("starts_at", { ascending: true });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Breakout Rooms</h1>

      {!rooms || rooms.length === 0 ? (
        <p className="text-muted-foreground">No breakout rooms scheduled.</p>
      ) : (
        <div className="space-y-4">
          {rooms.map((room) => (
            <Card key={room.id} className="p-5 space-y-2">
              <div className="flex items-start justify-between">
                <h3 className="font-medium">{room.title}</h3>
                <Badge variant={
                  room.status === "open" ? "success"
                    : room.status === "full" ? "warning"
                    : "default"
                }>
                  {room.status}
                </Badge>
              </div>
              {room.description && (
                <p className="text-sm text-muted-foreground">{room.description}</p>
              )}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>{new Date(room.starts_at).toLocaleString()} - {new Date(room.ends_at).toLocaleTimeString()}</span>
                {room.facilitator_name && <span>Facilitator: {room.facilitator_name}</span>}
                {room.location && <span>Location: {room.location}</span>}
                <span>{room.breakout_room_participants.length}{room.max_capacity ? ` / ${room.max_capacity}` : ""} joined</span>
                {Array.isArray(room.sessions) && room.sessions[0] && <span>Session: {room.sessions[0].title}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
