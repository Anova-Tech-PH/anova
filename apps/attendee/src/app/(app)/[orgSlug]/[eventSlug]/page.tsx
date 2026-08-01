import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Clock,
  Ticket,
  ArrowLeft,
  Users,
  Mic2,
  ExternalLink,
  QrCode,
  Wifi,
  DoorOpen,
} from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";
import { Badge, Avatar } from "@attendly/ui/components";
import { RoomCard } from "@/features/breakout-rooms/components/room-card";

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

function getStatusConfig(status: string) {
  switch (status) {
    case "checked_in":
      return { label: "Checked In", dot: "bg-blue-500" };
    case "confirmed":
      return { label: "Confirmed", dot: "bg-emerald-500" };
    case "pending":
      return { label: "Pending", dot: "bg-amber-500" };
    case "cancelled":
      return { label: "Cancelled", dot: "bg-red-500" };
    default:
      return { label: status, dot: "bg-gray-400" };
  }
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

export default async function AttendeeEventPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch org
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", orgSlug)
    .single();

  if (!org) notFound();

  // Fetch event
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("organization_id", org.id)
    .eq("slug", eventSlug)
    .single();

  if (!event) notFound();

  // Fetch attendee's registration
  const { data: registration } = await supabase
    .from("registrations")
    .select("id, status, qr_code, created_at, ticket_types(name)")
    .eq("event_id", event.id)
    .eq("user_id", user.id)
    .single();

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
      "*, track:tracks(id, name, color), session_speakers(speaker_id, speakers(id, name, title, company, photo))"
    )
    .eq("event_id", event.id)
    .order("start_time");

  // Registration count
  const { count: regCount } = await supabase
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id);

  // Fetch breakout rooms
  const { data: rooms } = await supabase
    .from("breakout_rooms")
    .select(`
      *,
      sessions(id, title),
      breakout_room_participants(id, user_id)
    `)
    .eq("event_id", event.id)
    .order("starts_at", { ascending: true });

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

  const statusConfig = registration
    ? getStatusConfig(registration.status)
    : null;

  return (
    <div className="space-y-8">
      {/* Back nav */}
      <Link
        href="/my-events"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Events
      </Link>

      {/* Hero */}
      <div
        className={`relative overflow-hidden rounded-2xl ${event.cover_image ? "bg-black" : "bg-gradient-to-br from-primary/8 via-primary/4 to-transparent"}`}
      >
        {event.cover_image ? (
          <>
            <img
              src={event.cover_image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-50"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/70" />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 50%, oklch(0.445 0.107 195 / 0.06) 0%, transparent 50%), radial-gradient(circle at 80% 20%, oklch(0.55 0.12 180 / 0.05) 0%, transparent 40%)",
            }}
          />
        )}
        <div
          className={`relative px-6 py-10 sm:px-8 sm:py-14 ${event.cover_image ? "text-white" : ""}`}
        >
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {event.title}
          </h1>
          <div
            className={`mt-4 flex flex-wrap items-center gap-3 text-sm ${event.cover_image ? "text-white/80" : "text-muted-foreground"}`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Calendar
                className={`h-4 w-4 ${event.cover_image ? "text-white" : "text-primary"}`}
              />
              {formatDateRange(event.start_date, event.end_date)}
            </span>
            {event.venue_name && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin
                  className={`h-4 w-4 ${event.cover_image ? "text-white" : "text-primary"}`}
                />
                {event.venue_name}
              </span>
            )}
            {event.is_virtual && (
              <span className="inline-flex items-center gap-1.5">
                <Wifi
                  className={`h-4 w-4 ${event.cover_image ? "text-white" : "text-primary"}`}
                />
                Virtual Event
              </span>
            )}
          </div>
          {/* Quick stats */}
          <div
            className={`mt-4 flex items-center gap-4 text-xs ${event.cover_image ? "text-white/60" : "text-muted-foreground"}`}
          >
            {(regCount ?? 0) > 0 && (
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {regCount} attendees
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
            {rooms && rooms.length > 0 && (
              <span className="flex items-center gap-1.5">
                <DoorOpen className="h-3.5 w-3.5" />
                {rooms.length} rooms
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Registration card */}
      {registration && statusConfig && (
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Your Registration
          </h2>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`}
                  />
                  {statusConfig.label}
                </span>
              </div>
              {(registration.ticket_types as any)?.name && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Ticket className="h-3.5 w-3.5" />
                  {(registration.ticket_types as any).name}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                Registered{" "}
                {new Date(registration.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
            {registration.qr_code && (
              <div className="flex flex-col items-center gap-1">
                <div className="rounded-lg border bg-white p-2">
                  <img
                    src={registration.qr_code}
                    alt="QR Code"
                    className="h-20 w-20"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Check-in QR
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* About */}
      {event.description && (
        <section>
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-primary" />
            <h2 className="text-lg font-semibold">About</h2>
          </div>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {event.description}
          </p>
        </section>
      )}

      {/* Speakers */}
      {speakers && speakers.length > 0 && (
        <section>
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-primary" />
            <h2 className="text-lg font-semibold">Speakers</h2>
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {speakers.length}
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {speakers.map((speaker) => (
              <div
                key={speaker.id}
                className="flex items-center gap-3 rounded-xl border bg-card p-4"
              >
                {speaker.photo ? (
                  <img
                    src={speaker.photo}
                    alt={speaker.name}
                    className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-background"
                  />
                ) : (
                  <Avatar name={speaker.name} size="lg" ring />
                )}
                <div className="min-w-0">
                  <h3 className="font-medium text-sm truncate">
                    {speaker.name}
                  </h3>
                  {(speaker.title || speaker.company) && (
                    <p className="text-xs text-muted-foreground truncate">
                      {[speaker.title, speaker.company]
                        .filter(Boolean)
                        .join(" at ")}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Schedule */}
      {sessions && sessions.length > 0 && (
        <section>
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-primary" />
            <h2 className="text-lg font-semibold">Schedule</h2>
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {sessions.filter((s) => s.type !== "break").length} sessions
            </span>
          </div>
          <div className="mt-4 space-y-6">
            {Object.entries(dayGroups).map(([day, daySessions]) => (
              <div key={day}>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  {day}
                </h3>
                <div className="space-y-2">
                  {daySessions!.map((session) => (
                    <div
                      key={session.id}
                      className={`rounded-lg border p-3 ${session.type === "break" ? "bg-muted/40" : "bg-card"}`}
                      style={{
                        borderLeftWidth: 3,
                        borderLeftColor:
                          session.track?.color ?? "transparent",
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
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

      {/* Breakout Rooms */}
      {rooms && rooms.length > 0 && (
        <section>
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-primary" />
            <h2 className="text-lg font-semibold">Breakout Rooms</h2>
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {rooms.length}
            </span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room: any) => (
              <RoomCard
                key={room.id}
                room={room}
                currentUserId={user.id}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
