import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowLeft,
} from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";
import { Badge, Avatar } from "@attendly/ui/components";
import { BookmarkButton } from "../bookmark-button";
import { LikeButton } from "@/features/session-likes/components/like-button";
import { NoteCard } from "@/features/session-notes/components/note-button";
import { RsvpButton } from "@/features/rsvp/components/rsvp-button";
import { SessionFeedbackForm } from "@/features/feedback/components/session-feedback-form";
import { SessionPollCard } from "@/features/polls/components/session-poll-card";
import { AddPollDialog } from "@/features/polls/components/add-poll-dialog";
import { SessionChat } from "@/features/session-chat/components/session-chat";
import { SessionCommunityPreview } from "@/features/community/components/session-community-preview";
import { SessionDetailTabs } from "./session-detail-tabs";
import type { FeedbackQuestion } from "@/features/feedback/queries";
import type { PollWithResults } from "@/features/polls/queries";

function formatDate(iso: string, tz?: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(tz && { timeZone: tz }),
  });
}

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

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string; sessionId: string }>;
}) {
  const { orgSlug, eventSlug, sessionId } = await params;
  const basePath = `/${orgSlug}/${eventSlug}`;
  const supabase = await createClient();

  // Fetch session with related data
  const { data: session } = await supabase
    .from("sessions")
    .select(
      `*,
      track:tracks(id, name, color),
      session_speakers(speaker_id, speakers(id, name, title, company, photo, bio))`
    )
    .eq("id", sessionId)
    .single();

  if (!session) notFound();

  // Verify this session belongs to a published event at this slug
  const { data: event } = await supabase
    .from("events")
    .select("id, title, organization_id, timezone")
    .eq("id", session.event_id)
    .eq("status", "published")
    .single();

  if (!event) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Parallel data fetches
  const [
    bookmarkResult,
    likeCountResult,
    userLikeResult,
    rsvpCountResult,
    userRsvpResult,
    noteResult,
    pollsResult,
    feedbackFormResult,
    communityResult,
    communityCountResult,
    chatResult,
    attendingResult,
    profileResult,
    orgMemberResult,
  ] = await Promise.all([
    // Bookmark state
    user
      ? supabase
          .from("session_bookmarks")
          .select("user_id")
          .eq("session_id", sessionId)
          .eq("user_id", user.id)
          .single()
      : Promise.resolve({ data: null }),
    // Like count
    supabase
      .from("session_likes")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId),
    // User like
    user
      ? supabase
          .from("session_likes")
          .select("id")
          .eq("session_id", sessionId)
          .eq("user_id", user.id)
          .single()
      : Promise.resolve({ data: null }),
    // RSVP confirmed count
    supabase
      .from("session_rsvps")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("status", "confirmed"),
    // User RSVP
    user
      ? supabase
          .from("session_rsvps")
          .select("status")
          .eq("session_id", sessionId)
          .eq("user_id", user.id)
          .neq("status", "cancelled")
          .single()
      : Promise.resolve({ data: null }),
    // User note
    user
      ? supabase
          .from("session_notes")
          .select("content")
          .eq("session_id", sessionId)
          .eq("user_id", user.id)
          .single()
      : Promise.resolve({ data: null }),
    // Polls
    supabase
      .from("live_polls")
      .select("*")
      .eq("session_id", sessionId)
      .in("status", ["open", "closed"]),
    // Feedback form
    session.feedback_form_id
      ? supabase
          .from("feedback_forms")
          .select("id, questions")
          .eq("id", session.feedback_form_id)
          .single()
      : Promise.resolve({ data: null }),
    // Community topics (latest 5 for sidebar preview)
    supabase
      .from("community_topics")
      .select("id, title, type, description, pinned, community_posts(count)")
      .eq("event_id", event.id)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
    // Community total count
    supabase
      .from("community_topics")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id),
    // Chat messages
    supabase
      .from("session_chat_messages")
      .select("id, user_id, content, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
    // Attending count (bookmarks as proxy for "attending")
    supabase
      .from("session_bookmarks")
      .select("user_id", { count: "exact", head: true })
      .eq("session_id", sessionId),
    // Current user profile (for chat)
    user
      ? supabase
          .from("attendee_profiles")
          .select("display_name, avatar_url")
          .eq("id", user.id)
          .eq("event_id", event.id)
          .single()
      : Promise.resolve({ data: null }),
    // Org membership check (for poll creation)
    user
      ? supabase
          .from("organization_members")
          .select("user_id")
          .eq("organization_id", event.organization_id)
          .eq("user_id", user.id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const isBookmarked = !!bookmarkResult.data;
  const likeCount = likeCountResult.count ?? 0;
  const isLiked = !!userLikeResult.data;
  const rsvpCount = rsvpCountResult.count ?? 0;
  const userRsvpStatus = userRsvpResult.data?.status ?? null;
  const noteContent = noteResult.data?.content ?? null;
  const attendingCount = attendingResult.count ?? 0;
  const canCreatePoll = !!orgMemberResult.data;

  // Process polls with vote counts
  const pollsWithResults: {
    poll: PollWithResults;
    userVote: string | null;
    userTextResponse: string | null;
    userRating: number | null;
    userCheckboxVotes: string[];
  }[] = [];
  for (const poll of pollsResult.data ?? []) {
    const { data: votes } = await supabase
      .from("live_poll_votes")
      .select("option_id")
      .eq("poll_id", poll.id);

    const vote_counts: Record<string, number> = {};
    for (const v of votes ?? []) {
      vote_counts[v.option_id] = (vote_counts[v.option_id] ?? 0) + 1;
    }

    let userVote: string | null = null;
    let userTextResponse: string | null = null;
    let userRating: number | null = null;
    let userCheckboxVotes: string[] = [];

    const answerType = (poll.answer_type as string) ?? "multiple_choice";

    if (user && answerType === "multiple_choice") {
      const { data: uv } = await supabase
        .from("live_poll_votes")
        .select("option_id")
        .eq("poll_id", poll.id)
        .eq("user_id", user.id)
        .single();
      userVote = uv?.option_id ?? null;
    } else if (user && answerType !== "multiple_choice") {
      const { data: userVotes } = await supabase
        .from("live_poll_votes")
        .select("option_id, response_text, rating_value")
        .eq("poll_id", poll.id)
        .eq("user_id", user.id);

      if (answerType === "checkbox") {
        userCheckboxVotes = (userVotes ?? []).map((v) => v.option_id).filter(Boolean) as string[];
      } else if (answerType === "star_rating") {
        userRating = (userVotes?.[0]?.rating_value as number) ?? null;
      } else {
        userTextResponse = (userVotes?.[0]?.response_text as string) ?? null;
      }
    }

    pollsWithResults.push({
      poll: {
        ...poll,
        options: (poll.options ?? []) as PollWithResults["options"],
        vote_counts,
        total_votes: votes?.length ?? 0,
      },
      userVote,
      userTextResponse,
      userRating,
      userCheckboxVotes,
    });
  }

  // Process community topics for sidebar preview
  const communityTopics = (communityResult.data ?? []).map((t) => ({
    id: t.id as string,
    title: t.title as string,
    type: t.type as "discussion" | "announcement" | "meetup" | "ask_organizer",
    description: t.description as string | null,
    post_count:
      (t.community_posts as unknown as { count: number }[])?.[0]?.count ?? 0,
    pinned: t.pinned as boolean,
  }));
  const communityTotalCount = communityCountResult.count ?? 0;

  // Process chat messages with author profiles
  const chatUserIds = [
    ...new Set((chatResult.data ?? []).map((m) => m.user_id)),
  ];
  let chatProfileMap = new Map<
    string,
    { display_name: string; avatar_url: string | null }
  >();
  if (chatUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("attendee_profiles")
      .select("id, display_name, avatar_url")
      .eq("event_id", event.id)
      .in("id", chatUserIds);
    for (const p of profiles ?? []) {
      chatProfileMap.set(p.id, {
        display_name: p.display_name,
        avatar_url: p.avatar_url,
      });
    }
  }

  const chatMessages = (chatResult.data ?? []).map((m) => ({
    id: m.id,
    user_id: m.user_id,
    content: m.content,
    created_at: m.created_at,
    author: chatProfileMap.get(m.user_id) ?? {
      display_name: "Anonymous",
      avatar_url: null,
    },
  }));

  // Feedback form
  const feedbackForm = feedbackFormResult.data
    ? {
        formId: feedbackFormResult.data.id,
        questions: (feedbackFormResult.data.questions ??
          []) as FeedbackQuestion[],
      }
    : null;

  // Speakers
  const speakers = (session.session_speakers ?? []).map((ss: Record<string, unknown>) => {
    const s = ss.speakers as Record<string, unknown>;
    return {
      id: s.id as string,
      name: s.name as string,
      title: s.title as string | null,
      company: s.company as string | null,
      photo: s.photo as string | null,
      bio: s.bio as string | null,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Back link */}
      <Link
        href={`${basePath}/schedule`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Show Agenda
      </Link>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ── Left Column: Session Info ── */}
        <div className="flex-1 min-w-0">
          {/* Like count */}
          <div className="flex justify-end mb-2">
            <LikeButton
              sessionId={sessionId}
              initialLiked={isLiked}
              initialCount={likeCount}
            />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold">{session.title}</h1>

          {/* Metadata */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(session.start_time, event.timezone)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {formatTime(session.start_time, event.timezone)} - {formatTime(session.end_time, event.timezone)}
            </span>
            {session.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {session.location}
                <Link
                  href={`/${orgSlug}/${eventSlug}/floormap?highlight=${encodeURIComponent(session.location)}`}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  View Map
                </Link>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {attendingCount} Attending
            </span>
          </div>

          {/* Type & Track badges */}
          <div className="mt-3 flex items-center gap-2">
            <Badge
              variant={typeBadgeVariant[session.type] ?? "default"}
            >
              {session.type}
            </Badge>
            {session.track && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: `${(session.track as { color: string }).color}15`,
                  color: (session.track as { color: string }).color,
                }}
              >
                {(session.track as { name: string }).name}
              </span>
            )}
          </div>

          {/* Action buttons */}
          {user && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <BookmarkButton
                sessionId={sessionId}
                initialBookmarked={isBookmarked}
              />
              {session.rsvp_enabled && (
                <RsvpButton
                  sessionId={sessionId}
                  initialStatus={userRsvpStatus}
                  confirmedCount={rsvpCount}
                  capacity={session.capacity}
                  rsvpEnabled={session.rsvp_enabled}
                />
              )}
            </div>
          )}

          {/* Personal Notes (Whova-style card) */}
          {user && (
            <div className="mt-6" id="notes">
              <NoteCard
                sessionId={sessionId}
                initialContent={noteContent}
              />
            </div>
          )}

          {/* Description */}
          {session.description && (
            <div className="mt-8">
              <h2 className="text-base font-semibold">Description</h2>
              <div className="mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {session.description}
              </div>
            </div>
          )}

          {/* Speakers */}
          {speakers.length > 0 && (
            <div className="mt-8">
              <h2 className="text-base font-semibold">
                {speakers.length === 1 ? "Speaker" : "Speakers"}
              </h2>
              <div className="mt-3 space-y-4">
                {speakers.map((speaker: { id: string; name: string; title: string | null; company: string | null; photo: string | null; bio: string | null }) => (
                  <div key={speaker.id} className="flex gap-3">
                    <Avatar
                      src={speaker.photo}
                      name={speaker.name}
                      size="lg"
                    />
                    <div>
                      <h3 className="font-medium">{speaker.name}</h3>
                      {(speaker.title || speaker.company) && (
                        <p className="text-sm text-muted-foreground">
                          {[speaker.title, speaker.company]
                            .filter(Boolean)
                            .join(" at ")}
                        </p>
                      )}
                      {speaker.bio && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
                          {speaker.bio}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Session Feedback (shows after session ends) */}
          {feedbackForm && (
            <div className="mt-8">
              <SessionFeedbackForm
                sessionId={sessionId}
                formId={feedbackForm.formId}
                questions={feedbackForm.questions}
                sessionEndTime={session.end_time}
              />
            </div>
          )}
        </div>

        {/* ── Right Column: Tabbed Sidebar ── */}
        <div className="w-full lg:w-[380px] shrink-0">
          <div className="sticky top-20 rounded-xl border bg-card overflow-hidden">
            <SessionDetailTabs
              pollsContent={
                <div className="space-y-4 p-4">
                  {canCreatePoll && (
                    <div className="flex justify-end">
                      <AddPollDialog
                        eventId={event.id}
                        sessionId={sessionId}
                      />
                    </div>
                  )}
                  {pollsWithResults.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No polls for this session yet.
                    </p>
                  ) : (
                    pollsWithResults.map(({ poll, userVote, userTextResponse, userRating, userCheckboxVotes }) => (
                      <SessionPollCard
                        key={poll.id}
                        poll={poll}
                        userVote={userVote}
                        userTextResponse={userTextResponse}
                        userRating={userRating}
                        userCheckboxVotes={userCheckboxVotes}
                      />
                    ))
                  )}
                </div>
              }
              chatContent={
                <SessionChat
                  sessionId={sessionId}
                  initialMessages={chatMessages}
                  currentUserId={user?.id ?? null}
                  currentUserName={profileResult.data?.display_name}
                  currentUserAvatar={profileResult.data?.avatar_url}
                />
              }
              communityContent={
                <SessionCommunityPreview
                  topics={communityTopics}
                  communityUrl={`${basePath}/community`}
                  totalCount={communityTotalCount}
                />
              }
              hasPolls={pollsWithResults.length > 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
