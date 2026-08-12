import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Linkedin, Twitter, Globe, MapPin, Clock, Tag } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";

export default async function PublicSpeakerDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string; speakerId: string }>;
}) {
  const { orgSlug, eventSlug, speakerId } = await params;
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

  const { data: speaker } = await supabase
    .from("speakers")
    .select(
      `*, session_speakers(sessions(id, title, start_time, end_time, location, type, tracks(name, color)))`
    )
    .eq("id", speakerId)
    .eq("event_id", event.id)
    .single();

  if (!speaker) notFound();

  const sessions = (speaker.session_speakers ?? [])
    .map((ss: { sessions: Record<string, unknown> }) => ss.sessions)
    .filter(Boolean)
    .sort((a: { start_time: string }, b: { start_time: string }) =>
      (a.start_time ?? "").localeCompare(b.start_time ?? "")
    );

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href={`/${orgSlug}/${eventSlug}/speakers`}
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Speakers
      </Link>

      {/* Speaker Header */}
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        {speaker.photo ? (
          <img
            src={speaker.photo}
            alt={speaker.name}
            className="h-28 w-28 shrink-0 rounded-full object-cover ring-2 ring-muted ring-offset-2 ring-offset-background"
          />
        ) : (
          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-muted ring-2 ring-muted ring-offset-2 ring-offset-background">
            <User className="h-12 w-12 text-muted-foreground" />
          </div>
        )}

        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-semibold">{speaker.name}</h1>
          {(speaker.title || speaker.company) && (
            <p className="mt-1 text-lg text-muted-foreground">
              {[speaker.title, speaker.company].filter(Boolean).join(" at ")}
            </p>
          )}

          {/* Social Links */}
          <div className="mt-3 flex items-center gap-3 justify-center sm:justify-start">
            {speaker.linkedin_url && (
              <a
                href={speaker.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
            )}
            {speaker.twitter_handle && (
              <a
                href={`https://twitter.com/${speaker.twitter_handle.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
            )}
            {speaker.website_url && (
              <a
                href={speaker.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                aria-label="Website"
              >
                <Globe className="h-5 w-5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Bio */}
      {speaker.bio && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">About</h2>
          <p className="mt-2 whitespace-pre-wrap text-muted-foreground leading-relaxed">
            {speaker.bio}
          </p>
        </div>
      )}

      {/* Sessions */}
      {sessions.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">Sessions</h2>
          <div className="mt-4 space-y-3">
            {sessions.map(
              (session: {
                id: string;
                title: string;
                start_time: string | null;
                end_time: string | null;
                location: string | null;
                type: string | null;
                tracks: { name: string; color: string } | null;
              }) => (
                <div
                  key={session.id}
                  className="rounded-xl border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-medium">{session.title}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        {session.start_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(session.start_time).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                            {session.end_time && (
                              <>
                                {" - "}
                                {new Date(session.end_time).toLocaleString(undefined, {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </>
                            )}
                          </span>
                        )}
                        {session.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {session.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {session.tracks && (
                        <span
                          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: `${session.tracks.color}20`,
                            color: session.tracks.color,
                          }}
                        >
                          {session.tracks.name}
                        </span>
                      )}
                      {session.type && (
                        <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize">
                          <Tag className="h-3 w-3" />
                          {session.type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
