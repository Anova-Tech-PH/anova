import { redirect } from "next/navigation";
import { createClient } from "@/shared/utils/supabase/server";
import { getEventAttendees } from "@/features/profile/queries";
import { getConnectionsForEvent } from "@/features/connections/actions";
import { AttendeeDirectory } from "@/features/profile/components/attendee-directory";

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const { event: eventId } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get user's registered events
  const { data: registrations } = await supabase
    .from("registrations")
    .select("event_id, events(id, title)")
    .eq("user_id", user.id)
    .in("status", ["confirmed", "checked_in"]);

  const events = registrations?.map((r) => r.events).filter(Boolean) ?? [];
  const selectedEventId = eventId ?? (events[0] as any)?.id;

  if (!selectedEventId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">People</h1>
        <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          Register for an event to connect with other attendees.
        </div>
      </div>
    );
  }

  const [attendees, connections] = await Promise.all([
    getEventAttendees(selectedEventId),
    getConnectionsForEvent(selectedEventId),
  ]);

  // Build connection map
  const connectionMap: Record<string, { status: string; direction: "sent" | "received"; connectionId: string }> = {};
  for (const c of connections.sent) {
    connectionMap[c.receiver_id] = { status: c.status, direction: "sent", connectionId: c.id };
  }
  for (const c of connections.received) {
    connectionMap[c.requester_id] = { status: c.status, direction: "received", connectionId: c.id };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">People</h1>
        {events.length > 1 && (
          <form>
            <select
              name="event"
              defaultValue={selectedEventId}
              onChange={(e) => {
                const url = new URL(window.location.href);
                url.searchParams.set("event", e.target.value);
                window.location.href = url.toString();
              }}
              className="rounded-lg border bg-background px-3 py-1.5 text-sm"
            >
              {events.map((evt: any) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title}
                </option>
              ))}
            </select>
          </form>
        )}
      </div>

      <AttendeeDirectory
        attendees={attendees}
        connectionMap={connectionMap}
        eventId={selectedEventId}
        currentUserId={user.id}
      />
    </div>
  );
}
