import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, MapPin, ArrowLeft } from "lucide-react";
import { createClient } from "@/shared/utils/supabase/server";
import { Badge, Avatar } from "@/shared/components/ui";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

const typeBadgeVariant: Record<string, "primary" | "info" | "success" | "warning" | "default"> = {
  keynote: "primary",
  talk: "info",
  workshop: "success",
  panel: "warning",
  break: "default",
};

export default async function PublicSchedulePage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  if (!org) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("organization_id", org.id)
    .eq("slug", eventSlug)
    .eq("status", "published")
    .single();

  if (!event) notFound();

  const { data: sessions } = await supabase
    .from("sessions")
    .select(`
      *,
      track:tracks(id, name, color),
      session_speakers(speaker_id, speakers(id, name, title, company, photo))
    `)
    .eq("event_id", event.id)
    .order("start_time");

  // Group by day
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
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href={`/${orgSlug}/${eventSlug}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to event
      </Link>

      <h1 className="text-2xl font-semibold">{event.title} — Schedule</h1>

      {!sessions || sessions.length === 0 ? (
        <p className="mt-6 text-muted-foreground">
          The schedule hasn&apos;t been published yet.
        </p>
      ) : (
        <div className="mt-8 space-y-8">
          {Object.entries(dayGroups).map(([day, daySessions]) => (
            <div key={day}>
              <h2 className="mb-4 text-lg font-medium">{day}</h2>
              <div className="space-y-3">
                {daySessions!.map((session) => (
                  <div
                    key={session.id}
                    className={`rounded-xl border p-4 ${session.type === "break" ? "bg-muted/50" : "bg-card"}`}
                    style={{
                      borderLeftWidth: 3,
                      borderLeftColor: session.track?.color ?? "transparent",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={typeBadgeVariant[session.type] ?? "default"}>
                        {session.type}
                      </Badge>
                      {session.track && (
                        <span className="text-[10px] text-muted-foreground">
                          {session.track.name}
                        </span>
                      )}
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
                        {formatTime(session.start_time)} - {formatTime(session.end_time)}
                      </span>
                      {session.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {session.location}
                        </span>
                      )}
                    </div>
                    {session.session_speakers.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {session.session_speakers.map(({ speakers: sp }: any) => (
                          <div key={sp.id} className="flex items-center gap-2">
                            <Avatar src={sp.photo} name={sp.name} size="sm" className="h-6 w-6" />
                            <div>
                              <span className="text-xs font-medium">{sp.name}</span>
                              {sp.title && (
                                <span className="text-[10px] text-muted-foreground"> · {sp.title}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
