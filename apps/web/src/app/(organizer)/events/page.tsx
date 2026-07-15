import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/shared/utils/supabase/server";
import { Badge, EmptyState } from "@/shared/components/ui";

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
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="group rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              {event.cover_image && (
                <div className="aspect-[2/1] overflow-hidden rounded-t-xl">
                  <img
                    src={event.cover_image}
                    alt={event.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      event.status === "published"
                        ? "success"
                        : event.status === "draft"
                          ? "warning"
                          : "default"
                    }
                  >
                    {event.status}
                  </Badge>
                </div>
                <h3 className="mt-2 font-semibold">{event.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {new Date(event.start_date).toLocaleDateString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
