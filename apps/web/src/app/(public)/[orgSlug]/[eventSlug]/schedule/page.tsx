import { notFound } from "next/navigation";
import { Clock, MapPin, Search, Calendar, CalendarPlus } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";
import { Badge, Avatar } from "@attendly/ui/components";
import Link from "next/link";
import { BookmarkButton } from "./bookmark-button";
import { RsvpButton } from "@/features/rsvp/components/rsvp-button";
import { SessionFeedbackForm } from "@/features/feedback/components/session-feedback-form";
import { SessionPollCard } from "@/features/polls/components/session-poll-card";
import { NoteButton } from "@/features/session-notes/components/note-button";
import type { FeedbackQuestion } from "@/features/feedback/queries";
import type { PollWithResults } from "@/features/polls/queries";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDayTab(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
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
  searchParams,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
  searchParams: Promise<{ search?: string; day?: string; tab?: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const query = await searchParams;
  const basePath = `/${orgSlug}/${eventSlug}`;
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

  // Build session query with optional search filtering
  let sessionQuery = supabase
    .from("sessions")
    .select(`
      *,
      track:tracks(id, name, color),
      session_speakers(speaker_id, speakers(id, name, title, company, photo))
    `)
    .eq("event_id", event.id)
    .order("start_time");

  if (query.search) {
    sessionQuery = sessionQuery.or(
      `title.ilike.%${query.search}%,location.ilike.%${query.search}%,description.ilike.%${query.search}%`
    );
  }

  const { data: sessions } = await sessionQuery;

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

  // --- Fetch user notes for sessions ---
  const notesBySession: Record<string, string> = {};
  if (user && sessionIds.length > 0) {
    const { data: notes } = await supabase
      .from("session_notes")
      .select("session_id, content")
      .eq("user_id", user.id)
      .in("session_id", sessionIds);

    for (const n of notes ?? []) {
      notesBySession[n.session_id] = n.content;
    }
  }

  // Group by day using ISO date keys for URL params
  const dayGroupsOrdered: { dateKey: string; label: string; sessions: typeof sessions }[] = [];
  const dayMap = new Map<string, typeof sessions>();

  for (const s of sessions ?? []) {
    const dateKey = new Date(s.start_time).toISOString().split("T")[0]; // YYYY-MM-DD
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, []);
    }
    dayMap.get(dateKey)!.push(s);
  }

  for (const [dateKey, daySessions] of dayMap) {
    dayGroupsOrdered.push({
      dateKey,
      label: formatDayTab(dateKey + "T12:00:00"),
      sessions: daySessions,
    });
  }

  // Determine active tab and day
  const activeTab = query.tab === "my-agenda" && user ? "my-agenda" : "full";

  // When "My Agenda" tab is active, filter to only bookmarked sessions
  const agendaFilteredGroups = activeTab === "my-agenda"
    ? dayGroupsOrdered.map((g) => ({
        ...g,
        sessions: g.sessions!.filter((s) => bookmarkedIds.has(s.id)),
      })).filter((g) => g.sessions.length > 0)
    : dayGroupsOrdered;

  const dayKeys = agendaFilteredGroups.map((d) => d.dateKey);
  const activeDay = query.day && dayKeys.includes(query.day) ? query.day : dayKeys[0] ?? null;
  const activeDayGroup = agendaFilteredGroups.find((d) => d.dateKey === activeDay);
  const filteredSessions = activeDayGroup?.sessions ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* Header */}
      <h1 className="text-2xl font-semibold">{event.title} — Schedule</h1>

      {/* Full Agenda / My Agenda tabs */}
      {user && (
        <div className="mt-4 flex border-b">
          <Link
            href={`?${new URLSearchParams({
              ...(query.search ? { search: query.search } : {}),
              ...(query.day ? { day: query.day } : {}),
            }).toString()}`}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "full"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Full Agenda
          </Link>
          <Link
            href={`?${new URLSearchParams({
              tab: "my-agenda",
              ...(query.search ? { search: query.search } : {}),
              ...(query.day ? { day: query.day } : {}),
            }).toString()}`}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "my-agenda"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            My Agenda
          </Link>
        </div>
      )}

      {/* Search bar */}
      <form className="mt-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          name="search"
          placeholder="Search by title, location, or description..."
          defaultValue={query.search ?? ""}
          className="w-full rounded-lg border bg-background pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
        {query.day && <input type="hidden" name="day" value={query.day} />}
        {activeTab === "my-agenda" && <input type="hidden" name="tab" value="my-agenda" />}
      </form>

      {activeTab === "my-agenda" && agendaFilteredGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <CalendarPlus className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-medium">No sessions in your agenda</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse the full agenda and tap &ldquo;Add to My Agenda&rdquo; on sessions you want to attend.
          </p>
          <Link
            href={`${basePath}/schedule`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Browse full agenda
          </Link>
        </div>
      ) : !sessions || sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-medium">
            {query.search ? "No sessions match your search" : "The schedule hasn\u2019t been published yet."}
          </h3>
          {query.search && (
            <Link
              href={`${basePath}/schedule${query.day ? `?day=${query.day}` : ""}`}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Clear search
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Day tabs */}
          {agendaFilteredGroups.length > 1 && (
            <div className="mt-6 flex gap-1 overflow-x-auto border-b">
              {agendaFilteredGroups.map((dayGroup) => (
                <Link
                  key={dayGroup.dateKey}
                  href={`?${new URLSearchParams({
                    ...(activeTab === "my-agenda" ? { tab: "my-agenda" } : {}),
                    ...(query.search ? { search: query.search } : {}),
                    day: dayGroup.dateKey,
                  }).toString()}`}
                  className={`whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    dayGroup.dateKey === activeDay
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {dayGroup.label}
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({dayGroup.sessions!.length})
                  </span>
                </Link>
              ))}
            </div>
          )}

          {/* Sessions for active day */}
          <div className="mt-6 space-y-3">
            {filteredSessions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No sessions on this day.
              </p>
            ) : (
              filteredSessions.map((session) => {
                const sessionPolls = pollsBySession[session.id] ?? [];
                const sessionFeedback = feedbackBySession[session.id] ?? null;
                const sessionNote = notesBySession[session.id] ?? null;

                return (
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

                    {/* Actions: Add to My Agenda + Notes */}
                    {user && (
                      <div className="mt-3 border-t pt-3 flex items-center gap-2 flex-wrap">
                        <BookmarkButton
                          sessionId={session.id}
                          initialBookmarked={bookmarkedIds.has(session.id)}
                        />
                        {session.type !== "break" && (
                          <NoteButton
                            sessionId={session.id}
                            initialContent={sessionNote}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
