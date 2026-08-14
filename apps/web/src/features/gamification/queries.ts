"use server";

import { createClient } from "@attendly/ui/supabase/server";

// ============================================================
// Types
// ============================================================

export type GamificationConfig = {
  id: string;
  event_id: string;
  enabled: boolean;
  leaderboard_title: string;
  hide_organizers: boolean;
  prizes_description: string | null;
  prize_image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type PointRule = {
  id: string;
  event_id: string;
  activity_type: string;
  points: number;
  max_per_event: number | null;
  enabled: boolean;
};

export type LeaderboardEntry = {
  user_id: string;
  total_points: number;
  challenges_completed: number;
  last_activity_at: string | null;
  rank: number;
  full_name: string | null;
  avatar_url: string | null;
};

export type PointTransaction = {
  id: string;
  activity_type: string;
  points: number;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
};

export type BadgeDefinition = {
  id: string;
  event_id: string | null;
  name: string;
  description: string;
  icon: string;
  criteria_type: string;
  criteria_value: Record<string, unknown>;
  sort_order: number;
};

export type UserBadge = {
  id: string;
  badge_id: string;
  earned_at: string;
  badge: BadgeDefinition;
};

// ============================================================
// Query Functions
// ============================================================

/**
 * Get gamification config for an event.
 * Returns null if not found or on error.
 */
export async function getGamificationConfig(
  eventId: string
): Promise<GamificationConfig | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gamification_configs")
    .select("*")
    .eq("event_id", eventId)
    .single();

  if (error) return null;
  return data as GamificationConfig;
}

/**
 * Get point rules for an event, ordered by activity_type.
 * Returns empty array on error.
 */
export async function getPointRules(eventId: string): Promise<PointRule[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("point_rules")
    .select("*")
    .eq("event_id", eventId)
    .order("activity_type");

  if (error) return [];
  return (data as PointRule[]) ?? [];
}

/**
 * Get leaderboard entries for an event with profile info.
 * Returns entries ordered by total_points DESC with calculated rank.
 */
export async function getLeaderboard(
  eventId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<LeaderboardEntry[]> {
  const { limit = 50, offset = 0 } = options;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leaderboard_scores")
    .select("user_id, total_points, challenges_completed, last_activity_at, profiles(full_name, avatar_url)")
    .eq("event_id", eventId)
    .order("total_points", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return [];

  return (data ?? []).map((row: Record<string, unknown>, index: number) => {
    const profiles = row.profiles as { full_name: string | null; avatar_url: string | null } | null;
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

/**
 * Get point summary for a specific user in an event.
 * Returns null if user has no score or on error.
 */
export async function getUserPointSummary(
  eventId: string,
  userId: string
): Promise<{ totalPoints: number; rank: number; challengesCompleted: number } | null> {
  const supabase = await createClient();

  // Get the user's score
  const { data: score, error } = await supabase
    .from("leaderboard_scores")
    .select("total_points, challenges_completed")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .single();

  if (error || !score) return null;

  // Calculate rank by counting users with more points
  const { count } = await supabase
    .from("leaderboard_scores")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .gt("total_points", (score as Record<string, unknown>).total_points as number);

  return {
    totalPoints: (score as Record<string, unknown>).total_points as number,
    rank: (count ?? 0) + 1,
    challengesCompleted: (score as Record<string, unknown>).challenges_completed as number,
  };
}

/**
 * Get point transactions for a user in an event.
 * Returns empty array on error.
 */
export async function getUserTransactions(
  eventId: string,
  userId: string
): Promise<PointTransaction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("point_transactions")
    .select("id, activity_type, points, reference_id, reference_type, created_at")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data as PointTransaction[]) ?? [];
}

/**
 * Get badge definitions for an event (including global badges where event_id is null).
 * Returns empty array on error.
 */
export async function getBadgeDefinitions(
  eventId: string
): Promise<BadgeDefinition[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("badge_definitions")
    .select("*")
    .or(`event_id.eq.${eventId},event_id.is.null`)
    .order("sort_order");

  if (error) return [];
  return (data as BadgeDefinition[]) ?? [];
}

/**
 * Get badges earned by a user in an event, with badge definitions.
 * Returns empty array on error.
 */
export async function getUserBadges(
  eventId: string,
  userId: string
): Promise<UserBadge[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_badges")
    .select("id, badge_id, earned_at, badge:badge_definitions(*)")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .order("earned_at", { ascending: false });

  if (error) return [];
  return (data as unknown as UserBadge[]) ?? [];
}

/**
 * Get challenge progress for a user: cross-references point_rules with transaction counts.
 * Returns empty array on error.
 */
export async function getChallengeProgress(
  eventId: string,
  userId: string
): Promise<
  {
    activityType: string;
    count: number;
    pointsPerAction: number;
    maxPerEvent: number | null;
    enabled: boolean;
  }[]
> {
  const supabase = await createClient();

  // Get all point rules for the event
  const { data: rules, error: rulesError } = await supabase
    .from("point_rules")
    .select("activity_type, points, max_per_event, enabled")
    .eq("event_id", eventId)
    .order("activity_type");

  if (rulesError || !rules) return [];

  // Get user's transaction counts grouped by activity_type
  const { data: txnCounts, error: txnError } = await supabase
    .from("point_transactions")
    .select("activity_type, count:activity_type.count()")
    .eq("event_id", eventId)
    .eq("user_id", userId);

  if (txnError) return [];

  const countMap = new Map<string, number>();
  for (const row of txnCounts ?? []) {
    const r = row as Record<string, unknown>;
    countMap.set(r.activity_type as string, Number(r.count ?? 0));
  }

  return (rules as Record<string, unknown>[]).map((rule) => ({
    activityType: rule.activity_type as string,
    count: countMap.get(rule.activity_type as string) ?? 0,
    pointsPerAction: rule.points as number,
    maxPerEvent: rule.max_per_event as number | null,
    enabled: rule.enabled as boolean,
  }));
}

/**
 * Get users who have earned a specific badge.
 * Returns empty array on error.
 */
export async function getBadgeEarners(
  badgeId: string
): Promise<{ userId: string; fullName: string | null; earnedAt: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_badges")
    .select("user_id, earned_at, profiles(full_name)")
    .eq("badge_id", badgeId)
    .order("earned_at");

  if (error) return [];

  return (data ?? []).map((row: Record<string, unknown>) => {
    const profiles = row.profiles as { full_name: string | null } | null;
    return {
      userId: row.user_id as string,
      fullName: profiles?.full_name ?? null,
      earnedAt: row.earned_at as string,
    };
  });
}
