import Link from "next/link";
import { Plus, Calendar, MapPin, Wifi, Users } from "lucide-react";
import { createClient } from "@/shared/utils/supabase/server";
import { Badge, EmptyState } from "@/shared/components/ui";

function getStatusStyle(status: string) {
  switch (status) {
    case "published":
      return { bg: "bg-violet-100 dark:bg-violet-950/40", badge: "success" as const, label: "Published" };
    case "draft":
      return { bg: "bg-slate-100 dark:bg-slate-800/40", badge: "warning" as const, label: "Draft" };
    case "cancelled":
      return { bg: "bg-red-50 dark:bg-red-950/40", badge: "destructive" as const, label: "Cancelled" };
    case "completed":
      return { bg: "bg-emerald-50 dark:bg-emerald-950/40", badge: "info" as const, label: "Completed" };
    default:
      return { bg: "bg-muted", badge: "default" as const, label: status };
  }
}

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
        <h1 className="text-2xl font-semibold">Events</h1>
        <Link
          href="/events/new"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Event
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
              Create your first event
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const style = getStatusStyle(event.status);
            const regCount = regCounts[event.id] ?? 0;

            return (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/20"
              >
                {/* Status-colored placeholder header */}
                <div className={`relative flex h-28 items-center justify-center ${style.bg}`}>
                  <Calendar className="h-10 w-10 text-foreground/10" />
                  <div className="absolute left-3 top-3">
                    <Badge variant={style.badge}>{style.label}</Badge>
                  </div>
                  <div className="absolute right-3 top-3">
                    <span className="flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
                      <Users className="h-3 w-3" />
                      {regCount} reg.
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                    {event.title}
                  </h3>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>{new Date(event.start_date).toLocaleDateString()}</span>
                    </div>
                    {event.venue_name ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{event.venue_name}</span>
                      </div>
                    ) : event.is_virtual ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Wifi className="h-3.5 w-3.5 shrink-0" />
                        <span>Virtual Event</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
