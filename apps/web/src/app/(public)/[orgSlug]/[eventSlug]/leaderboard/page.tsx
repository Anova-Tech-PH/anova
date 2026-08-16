import { createClient } from "@attendly/ui/supabase/server";
import { notFound } from "next/navigation";
import {
  getGamificationConfig,
  getLeaderboard,
  getBadgeDefinitions,
  getUserBadges,
  getChallengeProgress,
  getUserPointSummary,
} from "@/features/gamification/queries";
import {
  getCongratulationCounts,
  getUserCongratulations,
} from "@/features/gamification/congratulation-queries";
import { LeaderboardFull } from "@/features/gamification/components/leaderboard-full";
import { BadgeGrid } from "@/features/gamification/components/badge-grid";
import { MyPointsPanel } from "@/features/gamification/components/my-points-panel";
import { ReferralShare } from "@/features/gamification/components/referral-share";
import { Trophy, Gift } from "lucide-react";

export default async function LeaderboardPage({
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

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("slug", eventSlug)
    .eq("organization_id", org?.id ?? "")
    .single();

  if (!event) notFound();

  const config = await getGamificationConfig(event.id);

  if (!config?.enabled) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Trophy className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="mt-2 text-muted-foreground">
          Coming Soon! Earn points by engaging with sessions, networking with
          attendees, and participating in event activities.
        </p>
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    leaderboard,
    badges,
    userBadges,
    challenges,
    congCounts,
    userCongs,
    pointSummary,
    profileResult,
  ] = await Promise.all([
    getLeaderboard(event.id, { limit: 50 }),
    getBadgeDefinitions(event.id),
    user ? getUserBadges(event.id, user.id) : Promise.resolve([]),
    user ? getChallengeProgress(event.id, user.id) : Promise.resolve([]),
    getCongratulationCounts(event.id),
    user
      ? getUserCongratulations(event.id, user.id)
      : Promise.resolve(new Set<string>()),
    user ? getUserPointSummary(event.id, user.id) : Promise.resolve(null),
    user
      ? supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  // Convert Map/Set to serializable formats for client components
  const congratulationCounts: Record<string, number> = {};
  for (const [k, v] of congCounts) {
    congratulationCounts[k] = v;
  }
  const userCongratulations = Array.from(userCongs);

  // Calculate completion percentage
  const enabledChallenges = challenges.filter((c) => c.enabled);
  const completedChallenges = enabledChallenges.filter((c) => c.count > 0);
  const completionPercent =
    enabledChallenges.length > 0
      ? Math.round(
          (completedChallenges.length / enabledChallenges.length) * 100
        )
      : 0;

  const userName =
    (profileResult.data as { full_name: string | null } | null)?.full_name ??
    user?.email ??
    "Anonymous";

  const userEntry = user
    ? leaderboard.find((e) => e.user_id === user.id)
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Prize banner */}
      {config.prizes_description && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Gift className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm font-medium text-amber-900">
            {config.prizes_description}
          </p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Left column — Rankings */}
        <div className="space-y-8">
          <LeaderboardFull
            entries={leaderboard}
            currentUserId={user?.id ?? null}
            userRank={userEntry?.rank ?? null}
            userPoints={userEntry?.total_points ?? null}
            title={config.leaderboard_title ?? "Leaderboard"}
            eventId={event.id}
            congratulationCounts={congratulationCounts}
            userCongratulations={userCongratulations}
            hideOrganizers={config.hide_organizers}
          />

          {badges.length > 0 && (
            <BadgeGrid allBadges={badges} earnedBadges={userBadges} />
          )}
        </div>

        {/* Right column — My Points (logged-in users only) */}
        {user && challenges.length > 0 && (
          <div className="space-y-6">
            <MyPointsPanel
              userName={userName}
              totalPoints={pointSummary?.totalPoints ?? 0}
              rank={pointSummary?.rank ?? null}
              completionPercent={completionPercent}
              challenges={challenges}
              basePath={`/${orgSlug}/${eventSlug}`}
            />

            <ReferralShare
              eventId={event.id}
              userId={user.id}
              baseUrl={`/${orgSlug}/${eventSlug}`}
            />
          </div>
        )}
      </div>

      {!user && (
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Sign in to track your progress and earn points!
          </p>
        </div>
      )}
    </div>
  );
}
