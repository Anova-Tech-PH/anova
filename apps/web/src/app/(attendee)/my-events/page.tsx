import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar, MapPin, Clock, Ticket, ChevronRight, Wifi } from "lucide-react";
import { createClient } from "@/shared/utils/supabase/server";
import { Badge, EmptyState } from "@/shared/components/ui";

function formatDateRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (s.toDateString() === e.toDateString()) {
    return s.toLocaleDateString("en-US", { ...opts, year: "numeric" });
  }
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.toLocaleDateString("en-US", opts)}–${e.getDate()}, ${s.getFullYear()}`;
  }
  return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
}

function daysUntil(date: string) {
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return null;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `In ${diff} days`;
}

function getStatusConfig(status: string) {
  switch (status) {
    case "checked_in":
      return { label: "Checked In", variant: "info" as const, dot: "bg-blue-500" };
    case "confirmed":
      return { label: "Confirmed", variant: "success" as const, dot: "bg-emerald-500" };
    case "pending":
      return { label: "Pending", variant: "warning" as const, dot: "bg-amber-500" };
    case "cancelled":
      return { label: "Cancelled", variant: "destructive" as const, dot: "bg-red-500" };
    default:
      return { label: status, variant: "default" as const, dot: "bg-gray-400" };
  }
}

export default async function MyEventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: registrations } = await supabase
    .from("registrations")
    .select(`
      id, status, qr_code, created_at,
      events(id, title, slug, start_date, end_date, venue_name, is_virtual, cover_image, status,
        organizations(slug, name)
      ),
      ticket_types(name)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const now = new Date();

  const upcoming = (registrations ?? []).filter((r) => {
    const event = r.events as any;
    return event && new Date(event.end_date) >= now;
  });

  const past = (registrations ?? []).filter((r) => {
    const event = r.events as any;
    return event && new Date(event.end_date) < now;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">My Events</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Events you&apos;ve registered for
        </p>
      </div>

      {!registrations || registrations.length === 0 ? (
        <EmptyState title="You haven't registered for any events yet." />
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Upcoming ({upcoming.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {upcoming.map((reg) => {
                  const event = reg.events as any;
                  const org = event?.organizations;
                  const statusConfig = getStatusConfig(reg.status);
                  const countdown = daysUntil(event.start_date);

                  return (
                    <Link
                      key={reg.id}
                      href={`/${org?.slug}/${event.slug}`}
                      className="group relative overflow-hidden rounded-xl border bg-card transition-all hover:shadow-lg hover:border-primary/20"
                    >
                      <div className="p-4">
                        {/* Status + countdown row */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                            <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                            {statusConfig.label}
                          </span>
                          {countdown && (
                            <span className="text-xs font-medium text-muted-foreground">
                              {countdown}
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                          {event.title}
                        </h3>

                        <div className="mt-3 space-y-1.5">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>{formatDateRange(event.start_date, event.end_date)}</span>
                          </div>
                          {event.venue_name ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span>{event.venue_name}</span>
                            </div>
                          ) : event.is_virtual ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Wifi className="h-3.5 w-3.5 shrink-0" />
                              <span>Virtual Event</span>
                            </div>
                          ) : null}
                          {(reg.ticket_types as any)?.name && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Ticket className="h-3.5 w-3.5 shrink-0" />
                              <span>{(reg.ticket_types as any).name}</span>
                            </div>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="mt-4 flex items-center justify-between border-t pt-3">
                          <span className="text-xs text-muted-foreground">
                            Registered {new Date(reg.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                            View Event <ChevronRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Past ({past.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {past.map((reg) => {
                  const event = reg.events as any;
                  const org = event?.organizations;
                  const statusConfig = getStatusConfig(reg.status);

                  return (
                    <Link
                      key={reg.id}
                      href={`/${org?.slug}/${event.slug}`}
                      className="group flex items-center gap-4 rounded-xl border bg-card p-4 opacity-75 transition-all hover:opacity-100 hover:shadow-md"
                    >
                      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-muted text-center">
                        <span className="text-[10px] font-medium uppercase text-muted-foreground">
                          {new Date(event.start_date).toLocaleDateString("en-US", { month: "short" })}
                        </span>
                        <span className="text-lg font-bold leading-tight">
                          {new Date(event.start_date).getDate()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                          {event.title}
                        </h3>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          {event.venue_name && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.venue_name}
                            </span>
                          )}
                          <Badge variant={statusConfig.variant} className="text-[10px]">
                            {statusConfig.label}
                          </Badge>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
