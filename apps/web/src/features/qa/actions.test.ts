import { describe, it, expect, vi, beforeEach } from "vitest";
import { revalidatePath } from "next/cache";

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

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Q&A Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  describe("submitQuestion", () => {
    it("creates question with 'approved' status when moderation is disabled", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({
          data: { id: "q-1", status: "approved", question_text: "How?" },
          error: null,
        })
      );

      const { submitQuestion } = await import("./actions");
      const result = await submitQuestion({
        session_id: "sess-1",
        event_id: "evt-1",
        question_text: "How?",
        is_anonymous: false,
        moderation_enabled: false,
      });

      expect(result).toHaveProperty("id", "q-1");
      expect(result).toHaveProperty("status", "approved");
      expect(mockFrom).toHaveBeenCalledWith("session_questions");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/qa");
    });

    it("creates question with 'pending' status when moderation is enabled", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({
          data: { id: "q-2", status: "pending", question_text: "Why?" },
          error: null,
        })
      );

      const { submitQuestion } = await import("./actions");
      const result = await submitQuestion({
        session_id: "sess-1",
        event_id: "evt-1",
        question_text: "Why?",
        is_anonymous: true,
        moderation_enabled: true,
      });

      expect(result).toHaveProperty("id", "q-2");
      expect(result).toHaveProperty("status", "pending");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/qa");
    });

    it("throws when user is not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const { submitQuestion } = await import("./actions");
      await expect(
        submitQuestion({
          session_id: "sess-1",
          event_id: "evt-1",
          question_text: "Test",
          is_anonymous: false,
          moderation_enabled: false,
        })
      ).rejects.toThrow("Authentication required");
    });
  });

  describe("answerQuestion", () => {
    it("updates question with answer and sets status to answered", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { answerQuestion } = await import("./actions");
      await answerQuestion("q-1", "evt-1", "Here is the answer");

      expect(mockFrom).toHaveBeenCalledWith("session_questions");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/qa");
    });
  });

  describe("moderateQuestion", () => {
    it("approves a question", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { moderateQuestion } = await import("./actions");
      await moderateQuestion("q-1", "evt-1", "approved");

      expect(mockFrom).toHaveBeenCalledWith("session_questions");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/qa");
    });

    it("rejects a question", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { moderateQuestion } = await import("./actions");
      await moderateQuestion("q-1", "evt-1", "rejected");

      expect(mockFrom).toHaveBeenCalledWith("session_questions");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/qa");
    });

    it("throws on invalid status", async () => {
      const { moderateQuestion } = await import("./actions");
      await expect(
        moderateQuestion("q-1", "evt-1", "invalid" as "approved")
      ).rejects.toThrow("Invalid status");
    });
  });

  describe("bulkModerateQuestions", () => {
    it("bulk approves multiple questions", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { bulkModerateQuestions } = await import("./actions");
      await bulkModerateQuestions(["q-1", "q-2", "q-3"], "evt-1", "approved");

      expect(mockFrom).toHaveBeenCalledWith("session_questions");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/qa");
    });

    it("throws on invalid status", async () => {
      const { bulkModerateQuestions } = await import("./actions");
      await expect(
        bulkModerateQuestions(["q-1"], "evt-1", "invalid" as "approved")
      ).rejects.toThrow("Invalid status");
    });
  });

  describe("togglePinQuestion", () => {
    it("pins a question", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { togglePinQuestion } = await import("./actions");
      await togglePinQuestion("q-1", "evt-1", true);

      expect(mockFrom).toHaveBeenCalledWith("session_questions");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/qa");
    });
  });

  describe("toggleUpvote", () => {
    it("removes upvote when one exists", async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // select existing upvote
          return createQueryMock({ data: { id: "uv-1" }, error: null });
        }
        // delete upvote
        return createQueryMock({ data: null, error: null });
      });

      const { toggleUpvote } = await import("./actions");
      const result = await toggleUpvote("q-1");

      expect(result).toEqual({ upvoted: false });
      expect(mockFrom).toHaveBeenCalledWith("question_upvotes");
    });

    it("adds upvote when none exists", async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // no existing upvote
          return createQueryMock({ data: null, error: { code: "PGRST116" } });
        }
        // insert upvote
        return createQueryMock({ data: null, error: null });
      });

      const { toggleUpvote } = await import("./actions");
      const result = await toggleUpvote("q-1");

      expect(result).toEqual({ upvoted: true });
    });
  });
});
