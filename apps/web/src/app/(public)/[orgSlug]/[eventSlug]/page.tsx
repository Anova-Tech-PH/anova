import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  MapPin,
  ExternalLink,
  Clock,
  User,
  Users,
  ArrowRight,
  Mic2,
} from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";
import { buttonVariants } from "@attendly/ui/components";
import { Badge, Avatar } from "@attendly/ui/components";
import { getActivityFeed } from "@/features/activity-feed/queries";
import { ActivityFeed } from "@/features/activity-feed/components/activity-feed";

function formatTime(iso: string, tz?: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    ...(tz && { timeZone: tz }),
  });
}

function formatDateRange(start: string, end: string, tz?: string) {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
    ...(tz && { timeZone: tz }),
  };
  const sStr = s.toLocaleDateString("en-US", { ...(tz && { timeZone: tz }) });
  const eStr = e.toLocaleDateString("en-US", { ...(tz && { timeZone: tz }) });
  if (sStr === eStr) {
    return s.toLocaleDateString("en-US", opts);
  }
  return `${s.toLocaleDateString("en-US", { month: "long", day: "numeric", ...(tz && { timeZone: tz }) })} – ${e.toLocaleDateString("en-US", opts)}`;
}

const typeBadgeVariant: Record<
  string,
  "primary" | "info" | "success" | "warning" | "default"
> = {
  keynote: "primary",
  talk: "info",
  workshop: "success",
  panel: "warning",
  break: "default",
};

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", orgSlug)
    .single();

  if (!org) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("organization_id", org.id)
    .eq("slug", eventSlug)
    .eq("status", "published")
    .single();

  if (!event) notFound();

  // Fetch speakers
  const { data: speakers } = await supabase
    .from("speakers")
    .select("*")
    .eq("event_id", event.id)
    .order("name");

  // Fetch sessions with speakers
  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      `*, track:tracks(id, name, color), session_speakers(speaker_id, speakers(id, name, title, company, photo))`
    )
    .eq("event_id", event.id)
    .order("start_time");

  // Fetch ticket types
  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("id, name, price, quantity")
    .eq("event_id", event.id)
    .order("price");

  // Registration count
  const { count: regCount } = await supabase
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id);

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if user is already registered
  let isRegistered = false;
  if (user) {
    const { count } = await supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id)
      .eq("user_id", user.id);
    isRegistered = (count ?? 0) > 0;
  }

  // Fetch activity feed for authenticated users
  let feedData: { items: Awaited<ReturnType<typeof getActivityFeed>>["items"]; total: number } = {
    items: [],
    total: 0,
  };
  if (user) {
    try {
      feedData = await getActivityFeed(event.id);
    } catch {
      // Feed table may not exist yet; gracefully degrade
    }
  }

  // Group sessions by day
  const dayGroups: Record<string, typeof sessions> = {};
  for (const s of sessions ?? []) {
    const day = new Date(s.start_time).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      ...(event.timezone && { timeZone: event.timezone }),
    });
    (dayGroups[day] ??= []).push(s);
  }

  const startingPrice = ticketTypes?.[0]?.price;

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <div className={`relative overflow-hidden ${event.cover_image ? "bg-black" : "bg-gradient-to-b from-primary/8 via-primary/4 to-transparent"}`}>
        {event.cover_image ? (
          <>
            <img
              src={event.cover_image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/70" />
          </>
        ) : (
          <>
            <div className="absolute inset-0" style={{
              backgroundImage: "radial-gradient(circle at 20% 50%, oklch(0.445 0.107 195 / 0.06) 0%, transparent 50%), radial-gradient(circle at 80% 20%, oklch(0.55 0.12 180 / 0.05) 0%, transparent 40%)",
            }} />
            <div className="absolute top-20 left-10 h-64 w-64 rounded-full bg-primary/[0.03] blur-3xl" />
            <div className="absolute bottom-10 right-10 h-48 w-48 rounded-full bg-info/[0.04] blur-3xl" />
          </>
        )}
        <div className={`relative mx-auto max-w-4xl px-4 py-24 text-center ${event.cover_image ? "text-white" : ""}`}>
          <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium shadow-sm backdrop-blur-sm ${event.cover_image ? "border-white/20 bg-white/10 text-white" : "bg-card/80 text-primary"}`}>
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${event.cover_image ? "bg-white/60" : "bg-primary/60"}`} />
              <span className={`relative inline-flex h-2 w-2 rounded-full ${event.cover_image ? "bg-white" : "bg-primary"}`} />
            </span>
            {org.name}
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {event.title}
          </h1>
          <div className={`mt-6 flex flex-wrap items-center justify-center gap-4 text-sm ${event.cover_image ? "text-white/80" : "text-muted-foreground"}`}>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 shadow-sm backdrop-blur-sm ${event.cover_image ? "bg-white/10" : "bg-card/60"}`}>
              <Calendar className={`h-4 w-4 ${event.cover_image ? "text-white" : "text-primary"}`} />
              {formatDateRange(event.start_date, event.end_date, event.timezone)}
            </span>
            {event.venue_name && (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 shadow-sm backdrop-blur-sm ${event.cover_image ? "bg-white/10" : "bg-card/60"}`}>
                <MapPin className={`h-4 w-4 ${event.cover_image ? "text-white" : "text-primary"}`} />
                {event.venue_name}
              </span>
            )}
            {event.is_virtual && (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 shadow-sm backdrop-blur-sm ${event.cover_image ? "bg-white/10" : "bg-card/60"}`}>
                <ExternalLink className={`h-4 w-4 ${event.cover_image ? "text-white" : "text-primary"}`} />
                Virtual Event
              </span>
            )}
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={`/register/${orgSlug}/${eventSlug}`}
              className={buttonVariants({
                size: "lg",
                className: "gap-2 px-8 shadow-lg shadow-primary/20",
              })}
            >
              {isRegistered ? "View My Ticket" : "Register Now"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            {!isRegistered && startingPrice != null && (
              <span className={`text-sm ${event.cover_image ? "text-white/70" : "text-muted-foreground"}`}>
                Starting from <span className={`font-semibold ${event.cover_image ? "text-white" : "text-foreground"}`}>${Number(startingPrice).toFixed(0)}</span>
              </span>
            )}
          </div>
          {/* Quick stats */}
          <div className={`mt-8 flex items-center justify-center gap-6 text-xs ${event.cover_image ? "text-white/70" : "text-muted-foreground"}`}>
            {(regCount ?? 0) > 0 && (
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {regCount} registered
              </span>
            )}
            {speakers && speakers.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Mic2 className="h-3.5 w-3.5" />
                {speakers.length} speakers
              </span>
            )}
            {sessions && sessions.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {sessions.filter((s) => s.type !== "break").length} sessions
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Activity Feed (authenticated users with feed items) ── */}
      {user && feedData.items.length > 0 && (
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-6 w-1 rounded-full bg-primary" />
                <h2 className="text-xl font-semibold">Activity</h2>
              </div>
              <ActivityFeed
                eventId={event.id}
                initialItems={feedData.items}
                total={feedData.total}
              />
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-6 w-1 rounded-full bg-primary" />
                <h2 className="text-xl font-semibold">Event Stats</h2>
              </div>
              <div className="rounded-lg border bg-card p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{regCount ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Attendees</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/10">
                    <Calendar className="h-4 w-4 text-info" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {sessions?.filter((s) => s.type !== "break").length ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Sessions</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
                    <Mic2 className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {speakers?.length ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Speakers</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-4xl px-4 py-12 space-y-16">
        {/* ── About ── */}
        {event.description && (
          <section>
            <div className="flex items-center gap-2">
              <div className="h-6 w-1 rounded-full bg-primary" />
              <h2 className="text-xl font-semibold">About the Event</h2>
            </div>
            <p className="mt-4 text-muted-foreground leading-relaxed whitespace-pre-wrap max-w-2xl">
              {event.description}
            </p>
          </section>
        )}

        {/* ── Speakers ── */}
        {speakers && speakers.length > 0 && (
          <section>
            <div className="flex items-center gap-2">
              <div className="h-6 w-1 rounded-full bg-primary" />
              <h2 className="text-xl font-semibold">Speakers</h2>
              <span className="ml-2 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{speakers.length}</span>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {speakers.map((speaker) => (
                <div
                  key={speaker.id}
                  className="group flex flex-col items-center rounded-xl border bg-card p-5 text-center transition-all hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5"
                >
                  {speaker.photo ? (
                    <img
                      src={speaker.photo}
                      alt={speaker.name}
                      className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-background shadow-md"
                    />
                  ) : (
                    <Avatar name={speaker.name} size="xl" ring />
                  )}
                  <h3 className="mt-3 font-semibold text-sm">{speaker.name}</h3>
                  {(speaker.title || speaker.company) && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[speaker.title, speaker.company]
                        .filter(Boolean)
                        .join(" at ")}
                    </p>
                  )}
                  {speaker.bio && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                      {speaker.bio}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Schedule ── */}
        {sessions && sessions.length > 0 && (
          <section>
            <div className="flex items-center gap-2">
              <div className="h-6 w-1 rounded-full bg-primary" />
              <h2 className="text-xl font-semibold">Schedule</h2>
              <span className="ml-2 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{sessions.filter(s => s.type !== "break").length} sessions</span>
            </div>
            <div className="mt-6 space-y-8">
              {Object.entries(dayGroups).map(([day, daySessions]) => (
                <div key={day}>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    {day}
                  </h3>
                  <div className="space-y-2">
                    {daySessions!.map((session) => (
                      <div
                        key={session.id}
                        className={`rounded-lg border p-4 ${session.type === "break" ? "bg-muted/40" : "bg-card"}`}
                        style={{
                          borderLeftWidth: 3,
                          borderLeftColor:
                            session.track?.color ?? "transparent",
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  typeBadgeVariant[session.type] ?? "default"
                                }
                              >
                                {session.type}
                              </Badge>
                              {session.track && (
                                <span className="text-[10px] text-muted-foreground">
                                  {session.track.name}
                                </span>
                              )}
                            </div>
                            <h4 className="mt-1.5 font-medium text-sm">
                              {session.title}
                            </h4>
                            {session.description && (
                              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                {session.description}
                              </p>
                            )}
                            {session.session_speakers.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {session.session_speakers.map(
                                  ({ speakers: sp }: any) => (
                                    <div
                                      key={sp.id}
                                      className="flex items-center gap-1.5"
                                    >
                                      <Avatar
                                        src={sp.photo}
                                        name={sp.name}
                                        size="sm"
                                        className="h-5 w-5"
                                      />
                                      <span className="text-[11px] font-medium">
                                        {sp.name}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 text-right text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(session.start_time, event.timezone)}
                            </div>
                            {session.location && (
                              <div className="mt-0.5 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {session.location}
                              </div>
                            )}
                            {session.location && (
                              <Link
                                href={`/${orgSlug}/${eventSlug}/floormap?highlight=${encodeURIComponent(session.location)}`}
                                className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                View Map
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Register CTA ── */}
        {!isRegistered && (
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-info/5 border p-10 text-center">
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
            <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-info/5 blur-2xl" />
            <div className="relative">
              <h2 className="text-2xl font-bold">Ready to join?</h2>
              <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
                Secure your spot at {event.title}.{" "}
                {ticketTypes && ticketTypes.length > 1
                  ? `${ticketTypes.length} ticket options available.`
                  : ""}
              </p>
              <Link
                href={`/register/${orgSlug}/${eventSlug}`}
                className={buttonVariants({
                  size: "lg",
                  className: "mt-8 gap-2 px-8 shadow-lg shadow-primary/20",
                })}
              >
                Register Now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
