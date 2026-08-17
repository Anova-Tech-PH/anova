import { createClient } from "@attendly/ui/supabase/server";
import { Clock, MapPin, Calendar, ArrowRight } from "lucide-react";
import { Avatar, Badge } from "@attendly/ui/components";
import Link from "next/link";
import { AuthGuard } from "../auth-guard";
import { getMyAgendaSessions } from "@/features/my-agenda/queries";

function formatTime(iso: string, tz?: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    ...(tz && { timeZone: tz }),
  });
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

export default async function MyAgendaPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
  searchParams: Promise<{ search?: string; day?: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const query = await searchParams;
  const basePath = `/${orgSlug}/${eventSlug}`;
  const currentPath = `${basePath}/my-agenda`;

  return (
    <AuthGuard currentPath={currentPath}>
      <MyAgendaContent
        orgSlug={orgSlug}
        eventSlug={eventSlug}
        search={query.search}
        activeDay={query.day}
      />
    </AuthGuard>
  );
}

async function MyAgendaContent({
  orgSlug,
  eventSlug,
  search,
  activeDay,
}: {
  orgSlug: string;
  eventSlug: string;
  search?: string;
  activeDay?: string;
}) {
  const supabase = await createClient();
  const basePath = `/${orgSlug}/${eventSlug}`;

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  const { data: event } = await supabase
    .from("events")
    .select("id, timezone")
    .eq("slug", eventSlug)
    .eq("organization_id", org?.id ?? "")
    .single();

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-semibold">Event not found</h2>
      </div>
    );
  }

  const sessions = await getMyAgendaSessions(event.id, { search });

  // Group by day
  const dayGroups: Record<string, typeof sessions> = {};
  for (const s of sessions) {
    const day = new Date(s.start_time).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      ...(event.timezone && { timeZone: event.timezone }),
    });
    (dayGroups[day] ??= []).push(s);
  }

  const dayKeys = Object.keys(dayGroups);
  const selectedDay = activeDay && dayKeys.includes(activeDay) ? activeDay : dayKeys[0];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Agenda</h1>
        <Link
          href={`${basePath}/schedule`}
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Go to full agenda
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Search */}
      <form className="mt-6">
        <input
          type="text"
          name="search"
          placeholder="Search sessions..."
          defaultValue={search ?? ""}
          className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </form>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-medium">No sessions found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse the full agenda to add sessions
          </p>
          <Link
            href={`${basePath}/schedule`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Browse agenda
          </Link>
        </div>
      ) : (
        <>
          {/* Day tabs */}
          {dayKeys.length > 1 && (
            <div className="mt-6 flex gap-1 overflow-x-auto border-b">
              {dayKeys.map((day) => (
                <Link
                  key={day}
                  href={`?${new URLSearchParams({
                    ...(search ? { search } : {}),
                    day,
                  }).toString()}`}
                  className={`whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    day === selectedDay
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {day}
                </Link>
              ))}
            </div>
          )}

          {/* Sessions */}
          <div className="mt-6 space-y-3">
            {(selectedDay ? dayGroups[selectedDay] ?? [] : sessions).map(
              (session) => (
                <div
                  key={session.id}
                  className={`rounded-xl border p-4 ${
                    session.type === "break" ? "bg-muted/50" : "bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={typeBadgeVariant[session.type] ?? "default"}
                    >
                      {session.type}
                    </Badge>
                  </div>
                  <h3 className="mt-1.5 font-medium">{session.title}</h3>
                  {session.description && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {session.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(session.start_time, event.timezone)} -{" "}
                      {formatTime(session.end_time, event.timezone)}
                    </span>
                    {session.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {session.location}
                        <Link
                          href={`/${orgSlug}/${eventSlug}/floormap?highlight=${encodeURIComponent(session.location)}`}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          View Map
                        </Link>
                      </span>
                    )}
                  </div>
                  {session.session_speakers?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {session.session_speakers.map(
                        ({ speakers: sp }: any) => (
                          <div key={sp.id} className="flex items-center gap-2">
                            <Avatar
                              src={sp.photo}
                              name={sp.name}
                              size="sm"
                              className="h-6 w-6"
                            />
                            <div>
                              <span className="text-xs font-medium">
                                {sp.name}
                              </span>
                              {sp.title && (
                                <span className="text-[10px] text-muted-foreground">
                                  {" "}
                                  · {sp.title}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
