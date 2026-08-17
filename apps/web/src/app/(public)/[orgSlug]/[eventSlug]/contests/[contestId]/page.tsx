import { notFound } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import {
  getContest,
  getContestEntries,
  getUserLikes,
} from "@/features/gamification/contest-queries";
import { ContestGallery } from "@/features/gamification/components/contest-gallery";
import { getBoothFrames } from "@/features/photo-booth/queries";

export default async function ContestDetailPage({
  params,
}: {
  params: Promise<{
    orgSlug: string;
    eventSlug: string;
    contestId: string;
  }>;
}) {
  const { orgSlug, eventSlug, contestId } = await params;
  const supabase = await createClient();

  // Resolve event from slugs
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("slug", eventSlug)
    .eq("organization_id", org?.id ?? "")
    .single();

  if (!event) notFound();

  // Fetch contest
  const contest = await getContest(contestId);
  if (!contest || contest.event_id !== event.id) notFound();

  // Fetch entries
  const entries = await getContestEntries(contestId);

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get user likes as string array (Sets can't be serialized across server/client boundary)
  let userLikes: string[] = [];
  if (user) {
    const likesSet = await getUserLikes(contestId, user.id);
    userLikes = Array.from(likesSet);
  }

  // Fetch booth frames for photo contests
  const frames = contest.type === "photo" ? await getBoothFrames(event.id) : [];

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <ContestGallery
        contest={contest}
        entries={entries}
        userLikes={userLikes}
        userId={user?.id ?? null}
        basePath={`/${orgSlug}/${eventSlug}/contests`}
        frames={frames}
      />
    </div>
  );
}
