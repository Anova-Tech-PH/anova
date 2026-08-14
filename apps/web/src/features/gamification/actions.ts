"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

// ── Default seed data ────────────────────────────────────────────────

const DEFAULT_POINT_RULES = [
  { activity_type: "poll_vote", points: 10 },
  { activity_type: "session_feedback", points: 15 },
  { activity_type: "session_rsvp", points: 5 },
  { activity_type: "community_post", points: 10 },
  { activity_type: "community_comment", points: 5 },
  { activity_type: "profile_update", points: 10, max_per_event: 1 },
  { activity_type: "meetup_join", points: 10 },
  { activity_type: "photo_upload", points: 5 },
  { activity_type: "message_sent", points: 2, max_per_event: 20 },
  { activity_type: "survey_complete", points: 20 },
] as const;

const DEFAULT_BADGES = [
  {
    name: "First Steps",
    description: "Earn your first point",
    criteria_type: "points_threshold",
    criteria_value: { threshold: 1 },
    icon: "footprints",
  },
  {
    name: "Social Butterfly",
    description: "Create 5 community posts",
    criteria_type: "activity_count",
    criteria_value: { activity: "community_post", count: 5 },
    icon: "butterfly",
  },
  {
    name: "Poll Star",
    description: "Vote in 5 polls",
    criteria_type: "activity_count",
    criteria_value: { activity: "poll_vote", count: 5 },
    icon: "bar-chart",
  },
  {
    name: "Feedback Champion",
    description: "Submit feedback for 3 sessions",
    criteria_type: "activity_count",
    criteria_value: { activity: "session_feedback", count: 3 },
    icon: "message-square",
  },
  {
    name: "Networking Pro",
    description: "RSVP to 5 sessions",
    criteria_type: "activity_count",
    criteria_value: { activity: "session_rsvp", count: 5 },
    icon: "users",
  },
  {
    name: "Rising Star",
    description: "Earn 100 points",
    criteria_type: "points_threshold",
    criteria_value: { threshold: 100 },
    icon: "trending-up",
  },
  {
    name: "Event MVP",
    description: "Earn 500 points",
    criteria_type: "points_threshold",
    criteria_value: { threshold: 500 },
    icon: "trophy",
  },
] as const;

// ── Actions ──────────────────────────────────────────────────────────

export async function enableGamification(eventId: string) {
  const supabase = await createClient();

  // 1. Upsert config with enabled = true
  const { error: configError } = await supabase
    .from("gamification_configs")
    .upsert(
      { event_id: eventId, enabled: true },
      { onConflict: "event_id" }
    );

  if (configError) throw new Error(configError.message);

  // 2. Seed default point rules (upsert on event_id, activity_type)
  const rules = DEFAULT_POINT_RULES.map((r) => ({
    event_id: eventId,
    activity_type: r.activity_type,
    points: r.points,
    ...("max_per_event" in r ? { max_per_event: r.max_per_event } : {}),
  }));

  const { error: rulesError } = await supabase
    .from("point_rules")
    .upsert(rules, { onConflict: "event_id,activity_type" });

  if (rulesError) throw new Error(rulesError.message);

  // 3. Seed default badges (check existing first, insert only new ones)
  const { data: existingBadges } = await supabase
    .from("badge_definitions")
    .select("name")
    .eq("event_id", eventId);

  const existingNames = new Set(
    (existingBadges ?? []).map((b: { name: string }) => b.name)
  );

  const newBadges = DEFAULT_BADGES.filter((b) => !existingNames.has(b.name)).map(
    (b) => ({
      event_id: eventId,
      name: b.name,
      description: b.description,
      criteria_type: b.criteria_type,
      criteria_value: b.criteria_value as Record<string, unknown>,
      icon: b.icon,
    })
  );

  if (newBadges.length > 0) {
    const { error: badgesError } = await supabase
      .from("badge_definitions")
      .insert(newBadges);

    if (badgesError) throw new Error(badgesError.message);
  }

  revalidatePath(`/events/${eventId}/gamification`);
}

export async function disableGamification(eventId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("gamification_configs")
    .update({ enabled: false })
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/gamification`);
}

export async function updateGamificationConfig(
  eventId: string,
  data: {
    leaderboard_title?: string;
    hide_organizers?: boolean;
    prizes_description?: string;
    prize_image_url?: string;
  }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("gamification_configs")
    .update(data)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/gamification`);
}

export async function updatePointRule(
  eventId: string,
  ruleId: string,
  data: {
    points?: number;
    max_per_event?: number | null;
    enabled?: boolean;
  }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("point_rules")
    .update(data)
    .eq("id", ruleId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/gamification`);
}

export async function createBadge(
  eventId: string,
  data: {
    name: string;
    description: string;
    criteria_type: string;
    criteria_value: Record<string, unknown>;
    icon: string;
  }
) {
  const supabase = await createClient();

  const { data: badge, error } = await supabase
    .from("badge_definitions")
    .insert({ event_id: eventId, ...data })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/gamification`);
  return badge;
}

export async function updateBadge(
  eventId: string,
  badgeId: string,
  data: {
    name?: string;
    criteria_type?: string;
    criteria_value?: Record<string, unknown>;
    icon?: string;
    description?: string;
  }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("badge_definitions")
    .update(data)
    .eq("id", badgeId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/gamification`);
}

export async function deleteBadge(eventId: string, badgeId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("badge_definitions")
    .delete()
    .eq("id", badgeId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/gamification`);
}

export async function recalculateLeaderboard(eventId: string) {
  const supabase = await createClient();

  const { error } = await supabase.rpc("recalculate_leaderboard", {
    _event_id: eventId,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/gamification`);
}
