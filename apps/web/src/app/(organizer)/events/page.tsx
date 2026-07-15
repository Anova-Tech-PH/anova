import Link from "next/link";
import { Plus, Calendar, MapPin, Wifi, Users, ArrowUpRight } from "lucide-react";
import { createClient } from "@/shared/utils/supabase/server";
import { Badge, EmptyState, Button } from "@/shared/components/ui";

function getStatusStyle(status: string) {
  switch (status) {
    case "published":
      return { bg: "bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-950/40 dark:to-violet-900/20", badge: "success" as const, label: "Published", dot: "bg-emerald-500" };
    case "draft":
      return { bg: "bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800/40 dark:to-slate-700/20", badge: "warning" as const, label: "Draft", dot: "bg-amber-500" };
    case "cancelled":
      return { bg: "bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/40 dark:to-red-900/20", badge: "destructive" as const, label: "Cancelled", dot: "bg-red-500" };
    case "completed":
      return { bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20", badge: "info" as const, label: "Completed", dot: "bg-blue-500" };
    default:
      return { bg: "bg-gradient-to-br from-muted to-muted/50", badge: "default" as const, label: status, dot: "bg-gray-400" };
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
        <div>
          <h1 className="text-2xl font-semibold">Events</h1>
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
                className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5"
              >
                {/* Status-colored header */}
                <div className={`relative flex h-28 items-center justify-center ${style.bg}`}>
                  <Calendar className="h-10 w-10 text-foreground/8" />
                  <div className="absolute left-3 top-3">
                    <Badge variant={style.badge}>{style.label}</Badge>
                  </div>
                  <div className="absolute right-3 top-3">
                    <span className="flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium backdrop-blur-sm shadow-sm">
                      <Users className="h-3 w-3" />
                      {regCount}
                    </span>
                  </div>
                  <div className="absolute right-3 bottom-3 opacity-0 translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0">
                    <span className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground shadow-sm">
                      Manage <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                    {event.title}
                  </h3>
                  <div className="mt-2.5 space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>{formatDate(event.start_date)}</span>
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
