import { createClient } from "@attendly/ui/supabase/server";
import { notFound } from "next/navigation";
import {
  getGamificationConfig,
  getLeaderboard,
  getBadgeDefinitions,
  getUserBadges,
  getChallengeProgress,
} from "@/features/gamification/queries";
import { LeaderboardFull } from "@/features/gamification/components/leaderboard-full";
import { ChallengesList } from "@/features/gamification/components/challenges-list";
import { BadgeGrid } from "@/features/gamification/components/badge-grid";
import { Trophy } from "lucide-react";
import { ReferralShare } from "@/features/gamification/components/referral-share";

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
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

  const config = await getGamificationConfig(event.id);

  // If gamification is not enabled, show coming soon
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

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch all data in parallel
  const [leaderboard, badges, userBadges, challenges] = await Promise.all([
    getLeaderboard(event.id, { limit: 50 }),
    getBadgeDefinitions(event.id),
    user ? getUserBadges(event.id, user.id) : Promise.resolve([]),
    user ? getChallengeProgress(event.id, user.id) : Promise.resolve([]),
  ]);

  // Find current user's rank and points
  const userEntry = user
    ? leaderboard.find((e) => e.user_id === user.id)
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <LeaderboardFull
        entries={leaderboard}
        currentUserId={user?.id ?? null}
        userRank={userEntry?.rank ?? null}
        userPoints={userEntry?.total_points ?? null}
        title={config.leaderboard_title ?? "Leaderboard"}
        eventId={event.id}
      />

      {user && challenges.length > 0 && (
        <ChallengesList challenges={challenges} />
      )}

      {badges.length > 0 && (
        <BadgeGrid
          allBadges={badges}
          earnedBadges={userBadges}
        />
      )}

      {user && (
        <ReferralShare
          eventId={event.id}
          userId={user.id}
          baseUrl={`/${orgSlug}/${eventSlug}`}
        />
      )}
    </div>
  );
}
