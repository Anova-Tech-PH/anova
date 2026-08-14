"use server";

import { createClient } from "@attendly/ui/supabase/server";

export type AwardResult = {
  points: number;
  newBadges: { id: string; name: string; icon: string }[];
};

export async function tryAwardPoints(
  eventId: string,
  userId: string,
  activityType: string,
  referenceId: string | null = null,
  referenceType: string | null = null
): Promise<AwardResult> {
  try {
    const supabase = await createClient();
    const { data: pointsAwarded, error } = await supabase.rpc("award_points", {
      _event_id: eventId,
      _user_id: userId,
      _activity_type: activityType,
      _reference_id: referenceId,
      _reference_type: referenceType,
    });

    if (error || !pointsAwarded) {
      return { points: 0, newBadges: [] };
    }

    const newBadges = await checkAndAwardBadges(supabase, eventId, userId);
    return { points: pointsAwarded as number, newBadges };
  } catch {
    return { points: 0, newBadges: [] };
  }
}

async function checkAndAwardBadges(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  userId: string
): Promise<{ id: string; name: string; icon: string }[]> {
  try {
    // Fetch badge definitions for this event + system defaults
    const { data: badges } = await supabase
      .from("badge_definitions")
      .select("id, name, icon, criteria_type, criteria_value, event_id")
      .or(`event_id.eq.${eventId},event_id.is.null`);

    if (!badges || badges.length === 0) return [];

    // Fetch already earned badges
    const { data: earnedBadges } = await supabase
      .from("user_badges")
      .select("badge_id")
      .eq("event_id", eventId)
      .eq("user_id", userId);

    const earnedIds = new Set((earnedBadges ?? []).map((b) => b.badge_id));

    // Fetch user's current state
    const { data: score } = await supabase
      .from("leaderboard_scores")
      .select("total_points")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .single();

    const totalPoints = score?.total_points ?? 0;

    // Fetch activity counts
    const { data: activityCounts } = await supabase
      .from("point_transactions")
      .select("activity_type")
      .eq("event_id", eventId)
      .eq("user_id", userId);

    const countsByType: Record<string, number> = {};
    for (const t of activityCounts ?? []) {
      countsByType[t.activity_type] = (countsByType[t.activity_type] ?? 0) + 1;
    }

    const newlyEarned: { id: string; name: string; icon: string }[] = [];

    for (const badge of badges) {
      if (earnedIds.has(badge.id)) continue;

      const criteria = badge.criteria_value as Record<string, unknown>;
      let met = false;

      switch (badge.criteria_type) {
        case "points_threshold":
          met = totalPoints >= (criteria.threshold as number);
          break;
        case "activity_count":
          met = (countsByType[criteria.activity as string] ?? 0) >= (criteria.count as number);
          break;
        case "specific_activity":
          met = (countsByType[criteria.activity as string] ?? 0) > 0;
          break;
      }

      if (met) {
        const { error } = await supabase.from("user_badges").insert({
          event_id: eventId,
          user_id: userId,
          badge_id: badge.id,
        });

        if (!error) {
          newlyEarned.push({ id: badge.id, name: badge.name, icon: badge.icon });
        }
      }
    }

    return newlyEarned;
  } catch {
    return [];
  }
}
