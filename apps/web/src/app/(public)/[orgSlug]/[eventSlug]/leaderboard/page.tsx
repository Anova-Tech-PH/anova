import { notFound } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { LeaderboardFull } from "@/features/gamification/components/leaderboard-full";
import { ChallengesList } from "@/features/gamification/components/challenges-list";
import { BadgeGrid } from "@/features/gamification/components/badge-grid";
import {
  getGamificationConfig,
  getLeaderboard,
  getUserPointSummary,
  getUserBadges,
  getBadgeDefinitions,
  getChallengeProgress,
} from "@/features/gamification/queries";

export default async function AttendeeLeaderboardPage({
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

  const config = await getGamificationConfig(event.id);
  if (!config?.enabled) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [leaderboard, allBadges] = await Promise.all([
    getLeaderboard(event.id, { limit: 50 }),
    getBadgeDefinitions(event.id),
  ]);

  let userSummary: Awaited<ReturnType<typeof getUserPointSummary>> = null;
  let userBadges: Awaited<ReturnType<typeof getUserBadges>> = [];
  let challenges: Awaited<ReturnType<typeof getChallengeProgress>> = [];

  if (user) {
    [userSummary, userBadges, challenges] = await Promise.all([
      getUserPointSummary(event.id, user.id),
      getUserBadges(event.id, user.id),
      getChallengeProgress(event.id, user.id),
    ]);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 space-y-8">
      <LeaderboardFull
        entries={leaderboard}
        currentUserId={user?.id ?? null}
        userRank={userSummary?.rank ?? null}
        userPoints={userSummary?.totalPoints ?? null}
        title={config.leaderboard_title}
      />
      {user && (
        <>
          <ChallengesList challenges={challenges} />
          <BadgeGrid allBadges={allBadges} earnedBadges={userBadges} />
        </>
      )}
    </div>
  );
}
