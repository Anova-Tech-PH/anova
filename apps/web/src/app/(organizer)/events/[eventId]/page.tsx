import { createClient } from "@attendly/ui/supabase/server";
import { notFound } from "next/navigation";
import { PeoplePane } from "./workspace/people-pane";
import { ProgrammePane } from "./workspace/programme-pane";
import { DoorPane } from "./workspace/door-pane";

export default async function EventWorkspacePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  // Fetch registrations
  const { data: registrations } = await supabase
    .from("registrations")
    .select("id, full_name, email, status, created_at, ticket_types(name)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  // Fetch sessions
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, title, type, start_time, end_time, location, enable_check_in, track:tracks(id, name, color)")
    .eq("event_id", eventId)
    .order("start_time");

  // Fetch check-in stats
  const { count: checkedInCount } = await supabase
    .from("check_ins")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  // Fetch ticket types with quantities
  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("id, name, price, quantity")
    .eq("event_id", eventId);

  // Count registrations per ticket type
  const { data: ticketCounts } = await supabase
    .from("registrations")
    .select("ticket_type_id")
    .eq("event_id", eventId);

  const ticketCountMap = new Map<string, number>();
  for (const r of ticketCounts ?? []) {
    ticketCountMap.set(r.ticket_type_id, (ticketCountMap.get(r.ticket_type_id) ?? 0) + 1);
  }

  const ticketsWithCounts = (ticketTypes ?? []).map((t) => ({
    ...t,
    sold: ticketCountMap.get(t.id) ?? 0,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] min-h-[560px]">
      <PeoplePane registrations={registrations ?? []} />
      <ProgrammePane sessions={sessions ?? []} eventId={eventId} />
      <DoorPane
        checkedInCount={checkedInCount ?? 0}
        totalCapacity={registrations?.length ?? 0}
        tickets={ticketsWithCounts}
      />
    </div>
  );
}
