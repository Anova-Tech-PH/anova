import { GamificationDashboard } from "@/features/gamification/components/gamification-dashboard";
import {
  getGamificationConfig,
  getPointRules,
  getLeaderboard,
  getBadgeDefinitions,
} from "@/features/gamification/queries";

export default async function GamificationPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const [config, rules, leaderboard, badges] = await Promise.all([
    getGamificationConfig(eventId),
    getPointRules(eventId),
    getLeaderboard(eventId, { limit: 50 }),
    getBadgeDefinitions(eventId),
  ]);

  return (
    <GamificationDashboard
      eventId={eventId}
      config={config}
      rules={rules}
      leaderboard={leaderboard}
      badges={badges}
    />
  );
}
