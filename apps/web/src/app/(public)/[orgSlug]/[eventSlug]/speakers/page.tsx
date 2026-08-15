import { notFound } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import {
  SpeakersClientPage,
  type SpeakerWithSessions,
} from "@/features/speakers/components/speakers-client-page";

export default async function PublicSpeakersPage({
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [speakersResult, bookmarksResult, notesResult] = await Promise.all([
    supabase
      .from("speakers")
      .select(
        `*, session_speakers(sessions(id, title, start_time, end_time, session_tracks(tracks(name, color))))`
      )
      .eq("event_id", event.id)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name"),
    user
      ? supabase
          .from("speaker_bookmarks")
          .select("speaker_id")
          .eq("user_id", user.id)
          .eq("event_id", event.id)
      : Promise.resolve({ data: [] }),
    user
      ? supabase
          .from("speaker_notes")
          .select("speaker_id, content")
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
  ]);

  const basePath = `/${orgSlug}/${eventSlug}`;

  const speakers: SpeakerWithSessions[] = (speakersResult.data ?? []).map(
    (s: Record<string, unknown>) => ({
      id: s.id as string,
      name: s.name as string,
      title: s.title as string | null,
      company: s.company as string | null,
      bio: s.bio as string | null,
      photo: s.photo as string | null,
      user_id: s.user_id as string | null,
      is_featured: (s.is_featured as boolean) ?? false,
      sessions: (
        (s.session_speakers as { sessions: Record<string, unknown> }[]) ?? []
      )
        .map((ss) => ss.sessions)
        .filter(Boolean)
        .map((sess: Record<string, unknown>) => ({
          id: sess.id as string,
          title: sess.title as string,
          start_time: sess.start_time as string | null,
          end_time: sess.end_time as string | null,
          tracks: (
            (
              sess.session_tracks as {
                tracks: { name: string; color: string };
              }[]
            ) ?? []
          ).map((st) => st.tracks),
        }))
        .sort(
          (
            a: { start_time: string | null },
            b: { start_time: string | null }
          ) => (a.start_time ?? "").localeCompare(b.start_time ?? "")
        ),
    })
  );

  const bookmarkedSpeakerIds = (
    bookmarksResult.data as { speaker_id: string }[] | null ?? []
  ).map((b) => b.speaker_id);

  const speakerNotes: Record<string, string> = {};
  (
    notesResult.data as { speaker_id: string; content: string }[] | null ?? []
  ).forEach((n) => {
    speakerNotes[n.speaker_id] = n.content;
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <SpeakersClientPage
        speakers={speakers}
        eventTitle={event.title}
        eventId={event.id}
        basePath={basePath}
        isLoggedIn={!!user}
        bookmarkedSpeakerIds={bookmarkedSpeakerIds}
        speakerNotes={speakerNotes}
      />
    </div>
  );
}
