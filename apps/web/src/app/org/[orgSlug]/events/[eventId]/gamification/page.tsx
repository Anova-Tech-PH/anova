import { createClient } from "@attendly/ui/supabase/server";
import { GamificationDashboard } from "@/features/gamification/components/gamification-dashboard";
import {
  getGamificationConfig,
  getPointRules,
  getLeaderboard,
  getBadgeDefinitions,
} from "@/features/gamification/queries";
import { getContests } from "@/features/gamification/contest-queries";
import { getTriviaGames } from "@/features/gamification/trivia-queries";
import { getReferralStats } from "@/features/gamification/referral-actions";

export default async function GamificationPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  // Fetch event details for org/event slugs
  const { data: event } = await supabase
    .from("events")
    .select("id, slug, organization:organizations(slug)")
    .eq("id", eventId)
    .single();

  const orgSlug = (event?.organization as unknown as { slug: string })?.slug ?? "";
  const eventSlug = event?.slug ?? "";

  const [config, rules, leaderboard, badges, contests, triviaGames, sponsorsResult, referralStatsRaw] = await Promise.all([
    getGamificationConfig(eventId),
    getPointRules(eventId),
    getLeaderboard(eventId, { limit: 50 }),
    getBadgeDefinitions(eventId),
    getContests(eventId),
    getTriviaGames(eventId),
    supabase.from("sponsors").select("id, name, logo").eq("event_id", eventId),
    getReferralStats(eventId),
  ]);

  const sponsors = (sponsorsResult.data ?? []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    name: s.name as string,
    logo_url: (s.logo as string | null),
  }));

  // Map referral stats to expected shape
  const referralStats = (referralStatsRaw ?? []).map((row: Record<string, unknown>) => {
    const profiles = row.profiles as { full_name: string | null } | null;
    return {
      user_id: (row.user_id as string) ?? "",
      code: row.code as string,
      registrations_count: row.registrations_count as number,
      full_name: profiles?.full_name ?? null,
    };
  });

  return (
    <GamificationDashboard
      eventId={eventId}
      config={config}
      rules={rules}
      leaderboard={leaderboard}
      badges={badges}
      contests={contests}
      triviaGames={triviaGames}
      sponsors={sponsors}
      referralStats={referralStats}
      orgSlug={orgSlug}
      eventSlug={eventSlug}
    />
  );
}
