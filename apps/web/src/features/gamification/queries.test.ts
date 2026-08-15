import { describe, it, expect, vi, beforeEach } from "vitest";

function createQueryMock(result: {
  data?: unknown;
  count?: number | null;
  error?: unknown;
}) {
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === "then") return (resolve: (v: unknown) => void) => resolve(result);
      return vi.fn(() => new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ from: mockFrom, rpc: mockRpc })
  ),
}));

describe("Gamification Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getGamificationConfig", () => {
    it("returns config for event", async () => {
      const mockConfig = {
        id: "cfg-1",
        event_id: "event-1",
        enabled: true,
        leaderboard_title: "Leaderboard",
        hide_organizers: true,
        prizes_description: null,
        prize_image_url: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };
      mockFrom.mockReturnValue(
        createQueryMock({ data: mockConfig, error: null })
      );

      const { getGamificationConfig } = await import("./queries");
      const result = await getGamificationConfig("event-1");

      expect(result).toEqual(mockConfig);
      expect(mockFrom).toHaveBeenCalledWith("gamification_configs");
    });

    it("returns null on error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "Not found" } })
      );

      const { getGamificationConfig } = await import("./queries");
      const result = await getGamificationConfig("event-1");

      expect(result).toBeNull();
    });
  });

  describe("getPointRules", () => {
    it("returns rules for event", async () => {
      const mockRules = [
        {
          id: "rule-1",
          event_id: "event-1",
          activity_type: "session_attend",
          points: 10,
          max_per_event: null,
          enabled: true,
        },
        {
          id: "rule-2",
          event_id: "event-1",
          activity_type: "poll_vote",
          points: 5,
          max_per_event: 3,
          enabled: true,
        },
      ];
      mockFrom.mockReturnValue(
        createQueryMock({ data: mockRules, error: null })
      );

      const { getPointRules } = await import("./queries");
      const result = await getPointRules("event-1");

      expect(result).toEqual(mockRules);
      expect(mockFrom).toHaveBeenCalledWith("point_rules");
    });

    it("returns empty array on error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "DB error" } })
      );

      const { getPointRules } = await import("./queries");
      const result = await getPointRules("event-1");

      expect(result).toEqual([]);
    });
  });

  describe("getLeaderboard", () => {
    it("returns leaderboard entries with profile info", async () => {
      const mockScores = [
        {
          user_id: "user-1",
          total_points: 100,
          challenges_completed: 5,
          last_activity_at: "2026-01-01T00:00:00Z",
          profiles: { full_name: "Alice", avatar_url: "https://example.com/alice.jpg" },
        },
        {
          user_id: "user-2",
          total_points: 80,
          challenges_completed: 3,
          last_activity_at: "2026-01-02T00:00:00Z",
          profiles: { full_name: "Bob", avatar_url: null },
        },
      ];
      mockFrom.mockReturnValue(
        createQueryMock({ data: mockScores, error: null })
      );

      const { getLeaderboard } = await import("./queries");
      const result = await getLeaderboard("event-1");

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        user_id: "user-1",
        total_points: 100,
        challenges_completed: 5,
        last_activity_at: "2026-01-01T00:00:00Z",
        rank: 1,
        full_name: "Alice",
        avatar_url: "https://example.com/alice.jpg",
      });
      expect(result[1].rank).toBe(2);
      expect(mockFrom).toHaveBeenCalledWith("leaderboard_scores");
    });

    it("returns empty array on error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "DB error" } })
      );

      const { getLeaderboard } = await import("./queries");
      const result = await getLeaderboard("event-1");

      expect(result).toEqual([]);
    });
  });

  describe("getUserPointSummary", () => {
    it("returns summary for user", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) {
          // leaderboard_scores query
          return createQueryMock({
            data: { total_points: 100, challenges_completed: 5 },
            error: null,
          });
        }
        // count of users with more points
        return createQueryMock({ data: null, count: 2, error: null });
      });

      const { getUserPointSummary } = await import("./queries");
      const result = await getUserPointSummary("event-1", "user-1");

      expect(result).toEqual({
        totalPoints: 100,
        rank: 3,
        challengesCompleted: 5,
      });
    });

    it("returns null when user has no score", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "Not found" } })
      );

      const { getUserPointSummary } = await import("./queries");
      const result = await getUserPointSummary("event-1", "user-1");

      expect(result).toBeNull();
    });
  });

  describe("getUserTransactions", () => {
    it("returns transactions for user", async () => {
      const mockTxns = [
        {
          id: "txn-1",
          activity_type: "session_attend",
          points: 10,
          reference_id: "sess-1",
          reference_type: "session",
          created_at: "2026-01-01T00:00:00Z",
        },
      ];
      mockFrom.mockReturnValue(
        createQueryMock({ data: mockTxns, error: null })
      );

      const { getUserTransactions } = await import("./queries");
      const result = await getUserTransactions("event-1", "user-1");

      expect(result).toEqual(mockTxns);
      expect(mockFrom).toHaveBeenCalledWith("point_transactions");
    });

    it("returns empty array on error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "DB error" } })
      );

      const { getUserTransactions } = await import("./queries");
      const result = await getUserTransactions("event-1", "user-1");

      expect(result).toEqual([]);
    });
  });

  describe("getBadgeDefinitions", () => {
    it("returns badges for event including global badges", async () => {
      const mockBadges = [
        {
          id: "badge-1",
          event_id: "event-1",
          name: "First Step",
          description: "Earn your first points",
          icon: "star",
          criteria_type: "points_total",
          criteria_value: { threshold: 10 },
          sort_order: 0,
        },
      ];
      mockFrom.mockReturnValue(
        createQueryMock({ data: mockBadges, error: null })
      );

      const { getBadgeDefinitions } = await import("./queries");
      const result = await getBadgeDefinitions("event-1");

      expect(result).toEqual(mockBadges);
      expect(mockFrom).toHaveBeenCalledWith("badge_definitions");
    });

    it("returns empty array on error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "DB error" } })
      );

      const { getBadgeDefinitions } = await import("./queries");
      const result = await getBadgeDefinitions("event-1");

      expect(result).toEqual([]);
    });
  });

  describe("getUserBadges", () => {
    it("returns user badges with definitions", async () => {
      const mockUserBadges = [
        {
          id: "ub-1",
          badge_id: "badge-1",
          earned_at: "2026-01-01T00:00:00Z",
          badge: {
            id: "badge-1",
            event_id: "event-1",
            name: "First Step",
            description: "Earn your first points",
            icon: "star",
            criteria_type: "points_total",
            criteria_value: { threshold: 10 },
            sort_order: 0,
          },
        },
      ];
      mockFrom.mockReturnValue(
        createQueryMock({ data: mockUserBadges, error: null })
      );

      const { getUserBadges } = await import("./queries");
      const result = await getUserBadges("event-1", "user-1");

      expect(result).toEqual(mockUserBadges);
      expect(mockFrom).toHaveBeenCalledWith("user_badges");
    });

    it("returns empty array on error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "DB error" } })
      );

      const { getUserBadges } = await import("./queries");
      const result = await getUserBadges("event-1", "user-1");

      expect(result).toEqual([]);
    });
  });

  describe("getChallengeProgress", () => {
    it("returns progress cross-referencing rules and transactions", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) {
          // point_rules query
          return createQueryMock({
            data: [
              {
                activity_type: "session_attend",
                points: 10,
                max_per_event: 5,
                enabled: true,
              },
              {
                activity_type: "poll_vote",
                points: 5,
                max_per_event: 3,
                enabled: true,
              },
            ],
            error: null,
          });
        }
        // point_transactions — individual rows (counted client-side)
        return createQueryMock({
          data: [
            { activity_type: "session_attend" },
            { activity_type: "session_attend" },
            { activity_type: "poll_vote" },
          ],
          error: null,
        });
      });

      const { getChallengeProgress } = await import("./queries");
      const result = await getChallengeProgress("event-1", "user-1");

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        activityType: "session_attend",
        count: 2,
        pointsPerAction: 10,
        maxPerEvent: 5,
        enabled: true,
      });
    });

    it("returns empty array on error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "DB error" } })
      );

      const { getChallengeProgress } = await import("./queries");
      const result = await getChallengeProgress("event-1", "user-1");

      expect(result).toEqual([]);
    });
  });

  describe("getBadgeEarners", () => {
    it("returns earners for a badge", async () => {
      const mockEarners = [
        {
          user_id: "user-1",
          earned_at: "2026-01-01T00:00:00Z",
          profiles: { full_name: "Alice" },
        },
        {
          user_id: "user-2",
          earned_at: "2026-01-02T00:00:00Z",
          profiles: { full_name: "Bob" },
        },
      ];
      mockFrom.mockReturnValue(
        createQueryMock({ data: mockEarners, error: null })
      );

      const { getBadgeEarners } = await import("./queries");
      const result = await getBadgeEarners("badge-1");

      expect(result).toEqual([
        { userId: "user-1", fullName: "Alice", earnedAt: "2026-01-01T00:00:00Z" },
        { userId: "user-2", fullName: "Bob", earnedAt: "2026-01-02T00:00:00Z" },
      ]);
      expect(mockFrom).toHaveBeenCalledWith("user_badges");
    });

    it("returns empty array on error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "DB error" } })
      );

      const { getBadgeEarners } = await import("./queries");
      const result = await getBadgeEarners("badge-1");

      expect(result).toEqual([]);
    });
  });
});
