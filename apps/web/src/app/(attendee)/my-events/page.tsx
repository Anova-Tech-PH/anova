import { redirect } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";

export default async function MyEventsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/my-events");

  const { data: registrations } = await supabase
    .from("registrations")
    .select(
      `
      id,
      status,
      created_at,
      events:event_id (
        id,
        title,
        slug,
        start_date,
        end_date,
        venue_name,
        is_virtual,
        cover_image,
        status,
        organizations:organization_id (
          slug,
          name
        )
      ),
      ticket_types:ticket_type_id (
        name
      )
    `
    )
    .eq("user_id", user.id)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  // Deduplicate by event — keep most recent registration per event
  const seen = new Map<string, (typeof registrations)[number]>();
  for (const reg of registrations ?? []) {
    const event = reg.events as unknown as { id: string };
    if (!event) continue;
    if (!seen.has(event.id)) {
      seen.set(event.id, reg);
    }
  }
  const items = Array.from(seen.values());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">My Events</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Events you&apos;re registered for
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground/40" />
          <h2 className="mt-4 text-lg font-medium">No events yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            When you register for an event, it will show up here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((reg) => {
            const event = reg.events as unknown as {
              id: string;
              title: string;
              slug: string;
              start_date: string;
              end_date: string;
              venue_name: string | null;
              is_virtual: boolean;
              cover_image: string | null;
              status: string;
              organizations: { slug: string; name: string };
            };
            const ticketType = reg.ticket_types as unknown as {
              name: string;
            };

            if (!event) return null;

            const org = event.organizations;
            const now = new Date();
            const isPast = new Date(event.end_date) < now;
            const startDate = new Date(event.start_date);
            const endDate = new Date(event.end_date);

            const dateLabel = formatDateRange(startDate, endDate);

            return (
              <Link
                key={reg.id}
                href={`/${org.slug}/${event.slug}`}
                className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
              >
                {/* Cover image */}
                {event.cover_image ? (
                  <div className="relative h-36 w-full overflow-hidden bg-muted">
                    <img
                      src={event.cover_image}
                      alt=""
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    {isPast && (
                      <span className="absolute right-2 top-2 rounded-full bg-muted/90 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        Past
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                    <Calendar className="h-8 w-8 text-primary/30" />
                    {isPast && (
                      <span className="absolute right-2 top-2 rounded-full bg-muted/90 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        Past
                      </span>
                    )}
                  </div>
                )}

                {/* Details */}
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h3 className="font-semibold leading-snug group-hover:text-primary">
                    {event.title}
                  </h3>

                  <p className="text-xs text-muted-foreground">{org.name}</p>

                  <div className="mt-auto flex flex-col gap-1.5 pt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {dateLabel}
                    </span>

                    {(event.venue_name || event.is_virtual) && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {event.is_virtual
                          ? "Online"
                          : event.venue_name}
                      </span>
                    )}
                  </div>

                  {ticketType && (
                    <span className="mt-2 inline-flex w-fit rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {ticketType.name}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatDateRange(start: Date, end: Date): string {
  const dateOpts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (sameDay) {
    return start.toLocaleDateString("en-US", dateOpts);
  }

  const sameYear = start.getFullYear() === end.getFullYear();
  const startOpts: Intl.DateTimeFormatOptions = sameYear
    ? { month: "short", day: "numeric" }
    : dateOpts;

  return `${start.toLocaleDateString("en-US", startOpts)} - ${end.toLocaleDateString("en-US", dateOpts)}`;
}
