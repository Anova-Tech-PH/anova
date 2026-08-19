import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";
import { EmptyState, Button } from "@attendly/ui/components";
import { getOrgBySlug } from "@/features/org/queries";
import { EventsList } from "./events-list";

export default async function EventsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await getOrgBySlug(orgSlug, user.id);
  if (!org) redirect("/onboarding");

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false });

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
        <Link href={`/org/${orgSlug}/events/new`}>
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
              href={`/org/${orgSlug}/events/new`}
              className="text-sm font-medium text-primary underline"
            >
              Create one now
            </Link>
          }
        />
      ) : (
        <EventsList events={events} regCounts={regCounts} orgSlug={orgSlug} />
      )}
    </div>
  );
}
