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
import { createClient } from "@/shared/utils/supabase/server";
import { buttonVariants } from "@/shared/components/ui";
import { Badge, Avatar } from "@/shared/components/ui";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
  };
  if (s.toDateString() === e.toDateString()) {
    return s.toLocaleDateString("en-US", opts);
  }
  return `${s.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – ${e.toLocaleDateString("en-US", opts)}`;
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

  // Group sessions by day
  const dayGroups: Record<string, typeof sessions> = {};
  for (const s of sessions ?? []) {
    const day = new Date(s.start_time).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    (dayGroups[day] ??= []).push(s);
  }

  const startingPrice = ticketTypes?.[0]?.price;

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-primary/8 via-primary/4 to-transparent">
        {/* Decorative background elements */}
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 20% 50%, oklch(0.445 0.107 195 / 0.06) 0%, transparent 50%), radial-gradient(circle at 80% 20%, oklch(0.55 0.14 245 / 0.05) 0%, transparent 40%)",
        }} />
        <div className="absolute top-20 left-10 h-64 w-64 rounded-full bg-primary/[0.03] blur-3xl" />
        <div className="absolute bottom-10 right-10 h-48 w-48 rounded-full bg-info/[0.04] blur-3xl" />
        {event.cover_image && (
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={event.cover_image}
              alt=""
              className="h-full w-full object-cover opacity-15 blur-sm"
            />
          </div>
        )}
        <div className="relative mx-auto max-w-4xl px-4 py-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card/80 px-4 py-1.5 text-sm font-medium text-primary shadow-sm backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            {org.name}
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {event.title}
          </h1>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card/60 px-3 py-1.5 shadow-sm backdrop-blur-sm">
              <Calendar className="h-4 w-4 text-primary" />
              {formatDateRange(event.start_date, event.end_date)}
            </span>
            {event.venue_name && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card/60 px-3 py-1.5 shadow-sm backdrop-blur-sm">
                <MapPin className="h-4 w-4 text-primary" />
                {event.venue_name}
              </span>
            )}
            {event.is_virtual && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card/60 px-3 py-1.5 shadow-sm backdrop-blur-sm">
                <ExternalLink className="h-4 w-4 text-primary" />
                Virtual Event
              </span>
            )}
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={`/${orgSlug}/${eventSlug}/register`}
              className={buttonVariants({
                size: "lg",
                className: "gap-2 px-8 shadow-lg shadow-primary/20",
              })}
            >
              Register Now
              <ArrowRight className="h-4 w-4" />
            </Link>
            {startingPrice != null && (
              <span className="text-sm text-muted-foreground">
                Starting from <span className="font-semibold text-foreground">${Number(startingPrice).toFixed(0)}</span>
              </span>
            )}
          </div>
          {/* Quick stats */}
          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground">
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
                              {formatTime(session.start_time)}
                            </div>
                            {session.location && (
                              <div className="mt-0.5 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {session.location}
                              </div>
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
              href={`/${orgSlug}/${eventSlug}/register`}
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
      </div>
    </div>
  );
}
