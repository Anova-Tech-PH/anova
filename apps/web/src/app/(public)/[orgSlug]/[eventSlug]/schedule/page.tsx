import { notFound } from "next/navigation";
import { Clock, MapPin } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";
import { Badge, Avatar } from "@attendly/ui/components";
import { BookmarkButton } from "./bookmark-button";
import { RsvpButton } from "@/features/rsvp/components/rsvp-button";
import { SessionFeedbackForm } from "@/features/feedback/components/session-feedback-form";
import { SessionPollCard } from "@/features/polls/components/session-poll-card";
import type { FeedbackQuestion } from "@/features/feedback/queries";
import type { PollWithResults } from "@/features/polls/queries";

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

  // Check if user is logged in for bookmark state
  const { data: { user } } = await supabase.auth.getUser();
  let bookmarkedIds = new Set<string>();
  if (user) {
    const sessionIds = (sessions ?? []).map((s) => s.id);
    if (sessionIds.length > 0) {
      const { data: bookmarks } = await supabase
        .from("session_bookmarks")
        .select("session_id")
        .eq("user_id", user.id)
        .in("session_id", sessionIds);
      bookmarkedIds = new Set((bookmarks ?? []).map((b) => b.session_id));
    }
  }

  // --- Fetch RSVP data for all sessions ---
  const sessionIds = (sessions ?? []).map((s) => s.id);
  const rsvpStatusMap: Record<string, string | null> = {};
  const rsvpCountMap: Record<string, number> = {};

  if (sessionIds.length > 0) {
    // Get confirmed counts per session
    const { data: rsvpData } = await supabase
      .from("session_rsvps")
      .select("session_id, status")
      .in("session_id", sessionIds)
      .eq("status", "confirmed");

    for (const r of rsvpData ?? []) {
      rsvpCountMap[r.session_id] = (rsvpCountMap[r.session_id] ?? 0) + 1;
    }

    // Get user's RSVP status
    if (user) {
      const { data: userRsvps } = await supabase
        .from("session_rsvps")
        .select("session_id, status")
        .eq("user_id", user.id)
        .in("session_id", sessionIds)
        .neq("status", "cancelled");

      for (const r of userRsvps ?? []) {
        rsvpStatusMap[r.session_id] = r.status;
      }
    }
  }

  // --- Fetch polls for sessions (open or closed) ---
  const pollsBySession: Record<string, { poll: PollWithResults; userVote: string | null }[]> = {};
  if (sessionIds.length > 0) {
    const { data: polls } = await supabase
      .from("live_polls")
      .select("*")
      .in("session_id", sessionIds)
      .in("status", ["open", "closed"]);

    for (const poll of polls ?? []) {
      const sid = poll.session_id as string;

      // Get vote counts
      const { data: votes } = await supabase
        .from("live_poll_votes")
        .select("option_id")
        .eq("poll_id", poll.id);

      const vote_counts: Record<string, number> = {};
      for (const v of votes ?? []) {
        vote_counts[v.option_id] = (vote_counts[v.option_id] ?? 0) + 1;
      }

      // Get user vote
      let userVote: string | null = null;
      if (user) {
        const { data: uv } = await supabase
          .from("live_poll_votes")
          .select("option_id")
          .eq("poll_id", poll.id)
          .eq("user_id", user.id)
          .single();
        userVote = uv?.option_id ?? null;
      }

      const pollWithResults: PollWithResults = {
        ...poll,
        options: (poll.options ?? []) as PollWithResults["options"],
        vote_counts,
        total_votes: votes?.length ?? 0,
      };

      (pollsBySession[sid] ??= []).push({ poll: pollWithResults, userVote });
    }
  }

  // --- Fetch feedback forms for sessions ---
  const feedbackBySession: Record<string, { formId: string; questions: FeedbackQuestion[] }> = {};
  if (sessionIds.length > 0) {
    // Get sessions with feedback forms
    const sessionsWithForms = (sessions ?? []).filter((s) => s.feedback_form_id);
    const formIds = [...new Set(sessionsWithForms.map((s) => s.feedback_form_id as string))];

    if (formIds.length > 0) {
      const { data: forms } = await supabase
        .from("feedback_forms")
        .select("id, questions")
        .in("id", formIds);

      const formMap: Record<string, FeedbackQuestion[]> = {};
      for (const f of forms ?? []) {
        formMap[f.id] = (f.questions ?? []) as FeedbackQuestion[];
      }

      for (const s of sessionsWithForms) {
        const fid = s.feedback_form_id as string;
        if (formMap[fid]) {
          feedbackBySession[s.id] = { formId: fid, questions: formMap[fid] };
        }
      }
    }
  }

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
                {daySessions!.map((session) => {
                  const sessionPolls = pollsBySession[session.id] ?? [];
                  const sessionFeedback = feedbackBySession[session.id] ?? null;

                  return (
                    <div
                      key={session.id}
                      className={`rounded-xl border p-4 ${session.type === "break" ? "bg-muted/50" : "bg-card"}`}
                      style={{
                        borderLeftWidth: 3,
                        borderLeftColor: session.track?.color ?? "transparent",
                      }}
                    >
                      <div className="flex items-center justify-between">
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
                        {user && (
                          <BookmarkButton
                            sessionId={session.id}
                            initialBookmarked={bookmarkedIds.has(session.id)}
                          />
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

                      {/* RSVP Button */}
                      {session.rsvp_enabled && (
                        <div className="mt-3">
                          <RsvpButton
                            sessionId={session.id}
                            initialStatus={rsvpStatusMap[session.id] ?? null}
                            confirmedCount={rsvpCountMap[session.id] ?? 0}
                            capacity={session.capacity ?? null}
                            rsvpEnabled={session.rsvp_enabled}
                          />
                        </div>
                      )}

                      {/* Active Polls */}
                      {sessionPolls.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {sessionPolls.map(({ poll, userVote }) => (
                            <SessionPollCard
                              key={poll.id}
                              poll={poll}
                              userVote={userVote}
                            />
                          ))}
                        </div>
                      )}

                      {/* Feedback Form (only after session ends) */}
                      {sessionFeedback && (
                        <div className="mt-3">
                          <SessionFeedbackForm
                            sessionId={session.id}
                            formId={sessionFeedback.formId}
                            questions={sessionFeedback.questions}
                            sessionEndTime={session.end_time}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
