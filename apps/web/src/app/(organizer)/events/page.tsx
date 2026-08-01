import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";
import { EmptyState, Button } from "@attendly/ui/components";
import { EventsList } from "./events-list";

export default async function EventsPage() {
  const supabase = await createClient();

  const { data: orgs } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "");

  const orgIds = orgs?.map((o) => o.organization_id) ?? [];

  const { data: events } = orgIds.length
    ? await supabase
        .from("events")
        .select("*")
        .in("organization_id", orgIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  // Fetch registration counts per event
  const regCounts: Record<string, number> = {};
  if (events && events.length > 0) {
    for (const event of events) {
      const { count } = await supabase
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id);
      regCounts[event.id] = count ?? 0;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <p className="text-sm text-muted-foreground">
            {events?.length ?? 0} event{events?.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link href="/events/new">
          <Button className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            New Event
          </Button>
        </Link>
      </div>

      {!events || events.length === 0 ? (
        <EmptyState
          title="No events yet"
          className="py-16"
          action={
            <Link
              href="/events/new"
              className="text-sm font-medium text-primary underline"
            >
              Create one now
            </Link>
          }
        />
      ) : (
        <EventsList events={events} regCounts={regCounts} />
      )}
    </div>
  );
}
