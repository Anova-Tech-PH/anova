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
const mockRpc = vi.fn();

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ from: mockFrom, rpc: mockRpc })
  ),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// ── Constants ────────────────────────────────────────────────────────
const EVENT_ID = "evt-001";
const GAME_ID = "game-001";
const USER_ID = "user-001";
const QUESTION_ID = "q-001";

// ── Tests ────────────────────────────────────────────────────────────

describe("trivia-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── createTriviaGame ─────────────────────────────────────────────
  describe("createTriviaGame", () => {
    it("inserts a game and returns it", async () => {
      const gameData = {
        title: "Science Quiz",
        description: "Test your knowledge",
        starts_at: "2026-09-01T10:00:00Z",
        ends_at: "2026-09-01T12:00:00Z",
        time_limit_seconds: 30,
        points_per_correct: 10,
      };
      const returnedGame = {
        id: GAME_ID,
        event_id: EVENT_ID,
        status: "draft",
        ...gameData,
      };

      mockFrom.mockReturnValue(
        createQueryMock({ data: returnedGame, error: null })
      );

      const { createTriviaGame } = await import("./trivia-actions");
      const result = await createTriviaGame(EVENT_ID, gameData);

      expect(mockFrom).toHaveBeenCalledWith("trivia_games");
      expect(result).toEqual(returnedGame);
    });

    it("throws on error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "Insert failed" } })
      );

      const { createTriviaGame } = await import("./trivia-actions");
      await expect(
        createTriviaGame(EVENT_ID, {
          title: "Quiz",
          starts_at: "2026-09-01T10:00:00Z",
          ends_at: "2026-09-01T12:00:00Z",
        })
      ).rejects.toThrow("Insert failed");
    });
  });

  // ── updateTriviaGame ─────────────────────────────────────────────
  describe("updateTriviaGame", () => {
    it("updates a game", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: null })
      );

      const { updateTriviaGame } = await import("./trivia-actions");
      await updateTriviaGame(EVENT_ID, GAME_ID, { title: "Updated Quiz" });

      expect(mockFrom).toHaveBeenCalledWith("trivia_games");
    });

    it("throws on error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "Update failed" } })
      );

      const { updateTriviaGame } = await import("./trivia-actions");
      await expect(
        updateTriviaGame(EVENT_ID, GAME_ID, { title: "X" })
      ).rejects.toThrow("Update failed");
    });
  });

  // ── deleteTriviaGame ─────────────────────────────────────────────
  describe("deleteTriviaGame", () => {
    it("deletes a game", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: null })
      );

      const { deleteTriviaGame } = await import("./trivia-actions");
      await deleteTriviaGame(EVENT_ID, GAME_ID);

      expect(mockFrom).toHaveBeenCalledWith("trivia_games");
    });

    it("throws on error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "Delete failed" } })
      );

      const { deleteTriviaGame } = await import("./trivia-actions");
      await expect(
        deleteTriviaGame(EVENT_ID, GAME_ID)
      ).rejects.toThrow("Delete failed");
    });
  });

  // ── addTriviaQuestion ────────────────────────────────────────────
  describe("addTriviaQuestion", () => {
    it("inserts a question and returns it", async () => {
      const questionData = {
        question_text: "What is 2+2?",
        options: ["3", "4", "5", "6"],
        correct_index: 1,
        sort_order: 0,
      };
      const returnedQuestion = { id: QUESTION_ID, game_id: GAME_ID, ...questionData };

      mockFrom.mockReturnValue(
        createQueryMock({ data: returnedQuestion, error: null })
      );

      const { addTriviaQuestion } = await import("./trivia-actions");
      const result = await addTriviaQuestion(GAME_ID, questionData);

      expect(mockFrom).toHaveBeenCalledWith("trivia_questions");
      expect(result).toEqual(returnedQuestion);
    });

    it("throws on error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "Insert failed" } })
      );

      const { addTriviaQuestion } = await import("./trivia-actions");
      await expect(
        addTriviaQuestion(GAME_ID, {
          question_text: "Q?",
          options: ["A", "B"],
          correct_index: 0,
        })
      ).rejects.toThrow("Insert failed");
    });
  });

  // ── updateTriviaQuestion ─────────────────────────────────────────
  describe("updateTriviaQuestion", () => {
    it("updates a question", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: null })
      );

      const { updateTriviaQuestion } = await import("./trivia-actions");
      await updateTriviaQuestion(QUESTION_ID, { question_text: "Updated?" });

      expect(mockFrom).toHaveBeenCalledWith("trivia_questions");
    });
  });

  // ── deleteTriviaQuestion ─────────────────────────────────────────
  describe("deleteTriviaQuestion", () => {
    it("deletes a question", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: null })
      );

      const { deleteTriviaQuestion } = await import("./trivia-actions");
      await deleteTriviaQuestion(QUESTION_ID);

      expect(mockFrom).toHaveBeenCalledWith("trivia_questions");
    });
  });

  // ── getNextTriviaQuestion ────────────────────────────────────────
  describe("getNextTriviaQuestion", () => {
    it("calls get_trivia_question RPC and returns question without correct_index", async () => {
      const rpcResult = {
        id: QUESTION_ID,
        question_text: "What is 2+2?",
        options: ["3", "4", "5", "6"],
        sort_order: 0,
      };
      mockRpc.mockResolvedValue({ data: rpcResult, error: null });

      const { getNextTriviaQuestion } = await import("./trivia-actions");
      const result = await getNextTriviaQuestion(GAME_ID, 0);

      expect(mockRpc).toHaveBeenCalledWith("get_trivia_question", {
        _game_id: GAME_ID,
        _question_index: 0,
      });
      expect(result).toEqual(rpcResult);
      // Should not contain correct_index
      expect(result).not.toHaveProperty("correct_index");
    });

    it("returns null when RPC returns null (game not active or no more questions)", async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      const { getNextTriviaQuestion } = await import("./trivia-actions");
      const result = await getNextTriviaQuestion(GAME_ID, 99);

      expect(result).toBeNull();
    });
  });

  // ── submitTriviaAnswer ───────────────────────────────────────────
  describe("submitTriviaAnswer", () => {
    it("calls submit_trivia_answer RPC and returns result", async () => {
      const rpcResult = { correct: true, correct_index: 1, points: 10 };
      mockRpc.mockResolvedValue({ data: rpcResult, error: null });

      const { submitTriviaAnswer } = await import("./trivia-actions");
      const result = await submitTriviaAnswer(
        GAME_ID,
        USER_ID,
        QUESTION_ID,
        1,
        2500
      );

      expect(mockRpc).toHaveBeenCalledWith("submit_trivia_answer", {
        _game_id: GAME_ID,
        _user_id: USER_ID,
        _question_id: QUESTION_ID,
        _selected_index: 1,
        _time_ms: 2500,
      });
      expect(result).toEqual(rpcResult);
    });

    it("throws when RPC returns error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Game not active" },
      });

      const { submitTriviaAnswer } = await import("./trivia-actions");
      await expect(
        submitTriviaAnswer(GAME_ID, USER_ID, QUESTION_ID, 0, 1000)
      ).rejects.toThrow("Game not active");
    });
  });

  // ── completeTriviaGame ───────────────────────────────────────────
  describe("completeTriviaGame", () => {
    it("marks attempt completed and awards points", async () => {
      // Call 1: update trivia_attempts.completed_at
      // Call 2: select trivia_games for event_id
      let callIdx = 0;
      mockFrom.mockImplementation((table: string) => {
        callIdx++;
        if (table === "trivia_attempts") {
          return createQueryMock({ data: null, error: null });
        }
        if (table === "trivia_games") {
          return createQueryMock({
            data: { event_id: EVENT_ID },
            error: null,
          });
        }
        return createQueryMock({ data: null, error: null });
      });

      // RPC for award_points
      mockRpc.mockResolvedValue({ data: 15, error: null });

      const { completeTriviaGame } = await import("./trivia-actions");
      await completeTriviaGame(GAME_ID, USER_ID);

      // Should have called from("trivia_attempts") to update completed_at
      expect(mockFrom).toHaveBeenCalledWith("trivia_attempts");
      // Should have called from("trivia_games") to look up event_id
      expect(mockFrom).toHaveBeenCalledWith("trivia_games");
      // Should have called award_points RPC
      expect(mockRpc).toHaveBeenCalledWith("award_points", {
        _event_id: EVENT_ID,
        _user_id: USER_ID,
        _activity_type: "trivia_complete",
        _reference_id: GAME_ID,
        _reference_type: "trivia_game",
      });
    });

    it("throws when attempt update fails", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({
          data: null,
          error: { message: "Attempt not found" },
        })
      );

      const { completeTriviaGame } = await import("./trivia-actions");
      await expect(
        completeTriviaGame(GAME_ID, USER_ID)
      ).rejects.toThrow("Attempt not found");
    });
  });
});
