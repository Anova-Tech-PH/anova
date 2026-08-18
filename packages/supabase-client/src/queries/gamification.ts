import type { SupabaseClient } from "@supabase/supabase-js";

export async function getLeaderboard(
  client: SupabaseClient,
  eventId: string,
  options?: { limit?: number; offset?: number }
) {
  const { limit = 50, offset = 0 } = options ?? {};

  const { data, error } = await client
    .from("leaderboard_scores")
    .select(
      "user_id, total_points, challenges_completed, last_activity_at, profiles(full_name, avatar_url)"
    )
    .eq("event_id", eventId)
    .order("total_points", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return [];

  return (data ?? []).map((row: Record<string, unknown>, index: number) => {
    const profiles = row.profiles as {
      full_name: string | null;
      avatar_url: string | null;
    } | null;
    return {
      user_id: row.user_id as string,
      total_points: row.total_points as number,
      challenges_completed: row.challenges_completed as number,
      last_activity_at: row.last_activity_at as string | null,
      rank: offset + index + 1,
      full_name: profiles?.full_name ?? null,
      avatar_url: profiles?.avatar_url ?? null,
    };
  });
}

export async function getUserPointSummary(
  client: SupabaseClient,
  eventId: string,
  userId: string
) {
  const { data: score, error } = await client
    .from("leaderboard_scores")
    .select("total_points, challenges_completed")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .single();

  if (error || !score) return null;

  const { count } = await client
    .from("leaderboard_scores")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .gt("total_points", (score as Record<string, unknown>).total_points as number);

  return {
    totalPoints: (score as Record<string, unknown>).total_points as number,
    rank: (count ?? 0) + 1,
    challengesCompleted: (score as Record<string, unknown>)
      .challenges_completed as number,
  };
}

export async function getUserBadges(
  client: SupabaseClient,
  eventId: string,
  userId: string
) {
  const { data, error } = await client
    .from("user_badges")
    .select("id, badge_id, earned_at, badge:badge_definitions(*)")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .order("earned_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function getChallengeProgress(
  client: SupabaseClient,
  eventId: string,
  userId: string
) {
  const { data: rules, error: rulesError } = await client
    .from("point_rules")
    .select("activity_type, points, max_per_event, enabled")
    .eq("event_id", eventId)
    .order("activity_type");

  if (rulesError || !rules) return [];

  const { data: txns, error: txnError } = await client
    .from("point_transactions")
    .select("activity_type")
    .eq("event_id", eventId)
    .eq("user_id", userId);

  if (txnError) return [];

  const countMap = new Map<string, number>();
  for (const row of (txns ?? []) as Record<string, unknown>[]) {
    const type = row.activity_type as string;
    countMap.set(type, (countMap.get(type) ?? 0) + 1);
  }

  return (rules as Record<string, unknown>[]).map((rule) => ({
    activityType: rule.activity_type as string,
    count: countMap.get(rule.activity_type as string) ?? 0,
    pointsPerAction: rule.points as number,
    maxPerEvent: rule.max_per_event as number | null,
    enabled: rule.enabled as boolean,
  }));
}
