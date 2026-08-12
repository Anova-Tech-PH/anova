import { notFound } from "next/navigation";
import { Clock, MapPin } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";
import { Badge, Avatar } from "@attendly/ui/components";
import { parseEmbedParams, isToggleOn } from "../parse-embed-params";
import { PoweredByFooter } from "../powered-by-footer";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
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

export default async function AgendaEmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const rawSearchParams = await searchParams;
  const embedParams = parseEmbedParams(rawSearchParams);

  const showDesc = isToggleOn(embedParams, "showDesc");
  const showSpeakers = isToggleOn(embedParams, "showSpeakers");
  const showTrack = isToggleOn(embedParams, "showTrack");
  const showTime = isToggleOn(embedParams, "showTime");
  const showLocation = isToggleOn(embedParams, "showLocation");

  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, title, slug, organization_id, organizations(slug)")
    .eq("id", eventId)
    .eq("status", "published")
    .single();

  if (!event) notFound();

  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      `
      *,
      track:tracks(id, name, color),
      session_speakers(speaker_id, speakers(id, name, title, company, photo))
    `
    )
    .eq("event_id", event.id)
    .order("start_time");

  // Build event URL for PoweredByFooter
  const orgSlug = (event as any).organizations?.slug;
  const eventUrl =
    orgSlug && event.slug ? `/${orgSlug}/${event.slug}` : undefined;

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

  return (
    <div className="p-4">
      {!sessions || sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No sessions scheduled yet.
        </p>
      ) : (
        <div className="space-y-5">
          {Object.entries(dayGroups).map(([day, daySessions]) => (
            <div key={day}>
              <h3 className="mb-2 text-sm font-semibold">{day}</h3>
              <div className="space-y-2">
                {daySessions!.map((session) => (
                  <div
                    key={session.id}
                    className={`rounded-lg border p-3 ${
                      session.type === "break" ? "bg-muted/50" : "bg-card"
                    }`}
                    style={{
                      borderLeftWidth: showTrack && session.track ? 3 : undefined,
                      borderLeftColor:
                        showTrack && session.track
                          ? (session.track.color ?? "transparent")
                          : undefined,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={typeBadgeVariant[session.type] ?? "default"}
                      >
                        {session.type}
                      </Badge>
                      {showTrack && session.track && (
                        <span className="text-[10px] text-muted-foreground">
                          {session.track.name}
                        </span>
                      )}
                    </div>

                    <h4 className="mt-1 text-sm font-medium">
                      {session.title}
                    </h4>

                    {showDesc && session.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {session.description}
                      </p>
                    )}

                    {(showTime || showLocation) && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        {showTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(session.start_time)} -{" "}
                            {formatTime(session.end_time)}
                          </span>
                        )}
                        {showLocation && session.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {session.location}
                          </span>
                        )}
                      </div>
                    )}

                    {showSpeakers && session.session_speakers.length > 0 && (
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
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <PoweredByFooter eventUrl={eventUrl} />
    </div>
  );
}
