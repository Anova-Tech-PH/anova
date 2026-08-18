import { describe, it, expect } from "vitest";
import { getLeaderboard, getUserPointSummary, getUserBadges, getChallengeProgress } from "./gamification";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createMockSupabaseClient, createMockSupabaseClientMultiTable } from "../test-helpers";

describe("getLeaderboard", () => {
  it("returns leaderboard entries with rank", async () => {
    const entries = [
      { user_id: "u1", total_points: 100, challenges_completed: 5, last_activity_at: null, profiles: { full_name: "Alice", avatar_url: null } },
    ];
    const client = createMockSupabaseClient({ data: entries }) as unknown as SupabaseClient;
    const result = await getLeaderboard(client, "event-1");
    expect(result).toHaveLength(1);
    expect(result[0].rank).toBe(1);
    expect(result[0].full_name).toBe("Alice");
    expect(client.from).toHaveBeenCalledWith("leaderboard_scores");
  });

  it("returns empty array on error", async () => {
    const client = createMockSupabaseClient({ error: { message: "fail" } }) as unknown as SupabaseClient;
    const result = await getLeaderboard(client, "event-1");
    expect(result).toEqual([]);
  });
});

describe("getUserPointSummary", () => {
  it("returns user point summary with rank", async () => {
    const client = createMockSupabaseClientMultiTable({
      leaderboard_scores: { data: { total_points: 50, challenges_completed: 3 }, count: 2 },
    }) as unknown as SupabaseClient;

    const result = await getUserPointSummary(client, "event-1", "user-1");
    expect(result).toBeDefined();
    expect(result!.totalPoints).toBe(50);
    expect(result!.rank).toBe(3);
  });

  it("returns null when no score found", async () => {
    const client = createMockSupabaseClient({ data: null, error: { message: "not found", code: "PGRST116" } }) as unknown as SupabaseClient;
    const result = await getUserPointSummary(client, "event-1", "user-1");
    expect(result).toBeNull();
  });
});

describe("getUserBadges", () => {
  it("returns badges for user", async () => {
    const badges = [{ id: "b1", badge_id: "bd1", earned_at: "2026-01-01", badge: { name: "First Steps" } }];
    const client = createMockSupabaseClient({ data: badges }) as unknown as SupabaseClient;
    const result = await getUserBadges(client, "event-1", "user-1");
    expect(result).toEqual(badges);
    expect(client.from).toHaveBeenCalledWith("user_badges");
  });

  it("returns empty array on error", async () => {
    const client = createMockSupabaseClient({ error: { message: "fail" } }) as unknown as SupabaseClient;
    const result = await getUserBadges(client, "event-1", "user-1");
    expect(result).toEqual([]);
  });
});

describe("getChallengeProgress", () => {
  it("returns challenge progress", async () => {
    const rules = [{ activity_type: "session_attend", points: 10, max_per_event: 5, enabled: true }];
    const txns = [{ activity_type: "session_attend" }, { activity_type: "session_attend" }];
    const client = createMockSupabaseClientMultiTable({
      point_rules: { data: rules },
      point_transactions: { data: txns },
    }) as unknown as SupabaseClient;

    const result = await getChallengeProgress(client, "event-1", "user-1");
    expect(result).toHaveLength(1);
    expect(result[0].activityType).toBe("session_attend");
    expect(result[0].count).toBe(2);
  });

  it("returns empty on error", async () => {
    const client = createMockSupabaseClient({ error: { message: "fail" } }) as unknown as SupabaseClient;
    const result = await getChallengeProgress(client, "event-1", "user-1");
    expect(result).toEqual([]);
  });
});
