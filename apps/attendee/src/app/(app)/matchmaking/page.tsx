import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles, ArrowRight, Calendar } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";
import { EmptyState } from "@attendly/ui/components";

export default async function MatchmakingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get user's registered events with org info
  const { data: registrations } = await supabase
    .from("registrations")
    .select("event_id, events(id, title, slug, start_date, organizations(slug, name))")
    .eq("user_id", user.id)
    .in("status", ["confirmed", "checked_in"]);

  // Deduplicate events and check which have matchmaking interests configured
  const allEvents = registrations?.map((r) => r.events).filter(Boolean) ?? [];
  const events = allEvents.filter(
    (evt: any, i: number, arr: any[]) =>
      arr.findIndex((e: any) => e.id === evt.id) === i
  );

  // Check which events have matchmaking interests
  const eventIds = events.map((e: any) => e.id);
  let eventsWithMatchmaking: any[] = [];

  if (eventIds.length > 0) {
    const { data: interests } = await supabase
      .from("event_interests")
      .select("event_id")
      .in("event_id", eventIds);

    const matchmakingEventIds = new Set(
      (interests ?? []).map((i: { event_id: string }) => i.event_id)
    );

    eventsWithMatchmaking = events.filter((e: any) =>
      matchmakingEventIds.has(e.id)
    );
  }

  if (eventsWithMatchmaking.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Matchmaking</h1>
        <EmptyState title="No events with matchmaking available yet." />
      </div>
    );
  }

  // If only one event has matchmaking, redirect directly
  if (eventsWithMatchmaking.length === 1) {
    const evt = eventsWithMatchmaking[0];
    const org = evt.organizations as any;
    redirect(`/${org.slug}/${evt.slug}/matchmaking`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Matchmaking</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find attendees with shared interests at your events.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {eventsWithMatchmaking.map((evt: any) => {
          const org = evt.organizations as any;
          return (
            <Link
              key={evt.id}
              href={`/${org.slug}/${evt.slug}/matchmaking`}
              className="group flex items-center justify-between rounded-xl border bg-card p-4 transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-medium text-sm truncate">{evt.title}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(evt.start_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
