import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Supabase mock plumbing ───────────────────────────────────────────

function createQueryMock(result: {
  data?: unknown;
  count?: number | null;
  error?: unknown;
}) {
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === "then")
        return (resolve: (v: unknown) => void) => resolve(result);
      return vi.fn(() => new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

const mockFrom = vi.fn();

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

// ── Constants ────────────────────────────────────────────────────────
const EVENT_ID = "evt-001";
const GAME_ID = "game-001";
const USER_ID = "user-001";

// ── Tests ────────────────────────────────────────────────────────────

describe("trivia-queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getTriviaGames ───────────────────────────────────────────────
  describe("getTriviaGames", () => {
    it("returns games with question counts", async () => {
      const mockGames = [
        {
          id: GAME_ID,
          event_id: EVENT_ID,
          title: "Science Quiz",
          description: "Test your knowledge",
          starts_at: "2026-09-01T10:00:00Z",
          ends_at: "2026-09-01T12:00:00Z",
          status: "active",
          time_limit_seconds: 30,
          points_per_correct: 10,
          created_at: "2026-08-01T00:00:00Z",
          trivia_questions: [{ count: 5 }],
        },
      ];
      mockFrom.mockReturnValue(
        createQueryMock({ data: mockGames, error: null })
      );

      const { getTriviaGames } = await import("./trivia-queries");
      const result = await getTriviaGames(EVENT_ID);

      expect(mockFrom).toHaveBeenCalledWith("trivia_games");
      expect(result).toHaveLength(1);
      expect(result[0].question_count).toBe(5);
      expect(result[0].title).toBe("Science Quiz");
    });

    it("returns empty array on error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "DB error" } })
      );

      const { getTriviaGames } = await import("./trivia-queries");
      const result = await getTriviaGames(EVENT_ID);

      expect(result).toEqual([]);
    });
  });

  // ── getTriviaQuestions ───────────────────────────────────────────
  describe("getTriviaQuestions", () => {
    it("returns questions ordered by sort_order", async () => {
      const mockQuestions = [
        {
          id: "q-1",
          game_id: GAME_ID,
          question_text: "What is 2+2?",
          options: ["3", "4", "5"],
          correct_index: 1,
          sort_order: 0,
        },
        {
          id: "q-2",
          game_id: GAME_ID,
          question_text: "What is 3+3?",
          options: ["5", "6", "7"],
          correct_index: 1,
          sort_order: 1,
        },
      ];
      mockFrom.mockReturnValue(
        createQueryMock({ data: mockQuestions, error: null })
      );

      const { getTriviaQuestions } = await import("./trivia-queries");
      const result = await getTriviaQuestions(GAME_ID);

      expect(mockFrom).toHaveBeenCalledWith("trivia_questions");
      expect(result).toHaveLength(2);
      expect(result[0].correct_index).toBe(1);
    });

    it("returns empty array on error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "DB error" } })
      );

      const { getTriviaQuestions } = await import("./trivia-queries");
      const result = await getTriviaQuestions(GAME_ID);

      expect(result).toEqual([]);
    });
  });

  // ── getTriviaLeaderboard ─────────────────────────────────────────
  describe("getTriviaLeaderboard", () => {
    it("returns completed attempts with profiles, ordered by score", async () => {
      const mockAttempts = [
        {
          id: "att-1",
          game_id: GAME_ID,
          user_id: "user-1",
          answers: [{ question_id: "q-1", correct: true }],
          score: 30,
          total_time_ms: 5000,
          completed_at: "2026-09-01T11:00:00Z",
          created_at: "2026-09-01T10:00:00Z",
          profiles: { full_name: "Alice", avatar_url: "https://example.com/alice.jpg" },
        },
        {
          id: "att-2",
          game_id: GAME_ID,
          user_id: "user-2",
          answers: [{ question_id: "q-1", correct: false }],
          score: 10,
          total_time_ms: 3000,
          completed_at: "2026-09-01T11:05:00Z",
          created_at: "2026-09-01T10:05:00Z",
          profiles: { full_name: "Bob", avatar_url: null },
        },
      ];
      mockFrom.mockReturnValue(
        createQueryMock({ data: mockAttempts, error: null })
      );

      const { getTriviaLeaderboard } = await import("./trivia-queries");
      const result = await getTriviaLeaderboard(GAME_ID);

      expect(mockFrom).toHaveBeenCalledWith("trivia_attempts");
      expect(result).toHaveLength(2);
      expect(result[0].score).toBe(30);
      expect(result[0].profile?.full_name).toBe("Alice");
      expect(result[1].profile?.full_name).toBe("Bob");
    });

    it("returns empty array on error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "DB error" } })
      );

      const { getTriviaLeaderboard } = await import("./trivia-queries");
      const result = await getTriviaLeaderboard(GAME_ID);

      expect(result).toEqual([]);
    });
  });

  // ── getUserTriviaAttempt ─────────────────────────────────────────
  describe("getUserTriviaAttempt", () => {
    it("returns user attempt", async () => {
      const mockAttempt = {
        id: "att-1",
        game_id: GAME_ID,
        user_id: USER_ID,
        answers: [],
        score: 20,
        total_time_ms: 5000,
        completed_at: null,
        created_at: "2026-09-01T10:00:00Z",
      };
      mockFrom.mockReturnValue(
        createQueryMock({ data: mockAttempt, error: null })
      );

      const { getUserTriviaAttempt } = await import("./trivia-queries");
      const result = await getUserTriviaAttempt(GAME_ID, USER_ID);

      expect(mockFrom).toHaveBeenCalledWith("trivia_attempts");
      expect(result).toEqual(mockAttempt);
    });

    it("returns null when not found", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "Not found" } })
      );

      const { getUserTriviaAttempt } = await import("./trivia-queries");
      const result = await getUserTriviaAttempt(GAME_ID, USER_ID);

      expect(result).toBeNull();
    });
  });

  // ── getTriviaQuestionCount ───────────────────────────────────────
  describe("getTriviaQuestionCount", () => {
    it("returns question count", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, count: 7, error: null })
      );

      const { getTriviaQuestionCount } = await import("./trivia-queries");
      const result = await getTriviaQuestionCount(GAME_ID);

      expect(mockFrom).toHaveBeenCalledWith("trivia_questions");
      expect(result).toBe(7);
    });

    it("returns 0 on error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "DB error" } })
      );

      const { getTriviaQuestionCount } = await import("./trivia-queries");
      const result = await getTriviaQuestionCount(GAME_ID);

      expect(result).toBe(0);
    });
  });
});
