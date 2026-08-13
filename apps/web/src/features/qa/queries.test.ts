import { describe, it, expect, vi, beforeEach } from "vitest";

function createQueryMock(result: { data?: unknown; error?: unknown }) {
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === "then") return (resolve: (v: unknown) => void) => resolve(result);
      return vi.fn(() => new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

const mockFrom = vi.fn();
const mockAuth = {
  getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
};

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom, auth: mockAuth })),
}));

describe("Q&A Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getQuestionsBySession", () => {
    it("returns approved and answered questions sorted correctly", async () => {
      const mockQuestions = [
        {
          id: "q-1",
          question_text: "Pinned question",
          is_pinned: true,
          upvote_count: 5,
          status: "approved",
          profiles: { full_name: "Alice", avatar_url: null },
        },
        {
          id: "q-2",
          question_text: "Popular question",
          is_pinned: false,
          upvote_count: 10,
          status: "answered",
          profiles: { full_name: "Bob", avatar_url: null },
        },
      ];

      mockFrom.mockReturnValue(
        createQueryMock({ data: mockQuestions, error: null })
      );

      const { getQuestionsBySession } = await import("./queries");
      const result = await getQuestionsBySession("sess-1");

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("id", "q-1");
      expect(mockFrom).toHaveBeenCalledWith("session_questions");
    });

    it("throws on error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "DB error" } })
      );

      const { getQuestionsBySession } = await import("./queries");
      await expect(getQuestionsBySession("sess-1")).rejects.toThrow("DB error");
    });
  });

  describe("getModerationQueue", () => {
    it("returns pending questions with session title", async () => {
      const mockPending = [
        {
          id: "q-3",
          session_id: "sess-1",
          question_text: "Pending question",
          status: "pending",
          profiles: { full_name: "Charlie", avatar_url: null },
          created_at: "2026-08-12T10:00:00Z",
        },
      ];

      const mockSessions = [
        { id: "sess-1", title: "Opening Keynote" },
      ];

      // First call returns questions, second returns sessions
      mockFrom
        .mockReturnValueOnce(createQueryMock({ data: mockPending, error: null }))
        .mockReturnValueOnce(createQueryMock({ data: mockSessions, error: null }));

      const { getModerationQueue } = await import("./queries");
      const result = await getModerationQueue("evt-1");

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("session_title", "Opening Keynote");
      expect(mockFrom).toHaveBeenCalledWith("session_questions");
      expect(mockFrom).toHaveBeenCalledWith("sessions");
    });

    it("returns empty array when no pending questions", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: [], error: null }));

      const { getModerationQueue } = await import("./queries");
      const result = await getModerationQueue("evt-1");

      expect(result).toHaveLength(0);
    });
  });

  describe("getQAStats", () => {
    it("counts questions by status", async () => {
      const mockData = [
        { status: "pending" },
        { status: "pending" },
        { status: "approved" },
        { status: "answered" },
        { status: "answered" },
        { status: "answered" },
        { status: "rejected" },
      ];

      mockFrom.mockReturnValue(
        createQueryMock({ data: mockData, error: null })
      );

      const { getQAStats } = await import("./queries");
      const stats = await getQAStats("evt-1");

      expect(stats).toEqual({
        total: 7,
        pending: 2,
        approved: 1,
        answered: 3,
        rejected: 1,
      });
    });

    it("returns zeros when no questions", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: [], error: null }));

      const { getQAStats } = await import("./queries");
      const stats = await getQAStats("evt-1");

      expect(stats).toEqual({
        total: 0,
        pending: 0,
        approved: 0,
        answered: 0,
        rejected: 0,
      });
    });
  });
});
