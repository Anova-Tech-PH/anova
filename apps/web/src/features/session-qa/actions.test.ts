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

describe("Session Q&A Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  describe("askQuestion", () => {
    it("inserts a question and revalidates", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: { id: "q-1" }, error: null })
      );

      const { askQuestion } = await import("./actions");
      await askQuestion({
        sessionId: "sess-1",
        eventId: "evt-1",
        content: "What is the roadmap?",
      });

      expect(mockFrom).toHaveBeenCalledWith("session_questions");
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });

    it("throws when user is not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const { askQuestion } = await import("./actions");
      await expect(
        askQuestion({
          sessionId: "sess-1",
          eventId: "evt-1",
          content: "Test question",
        })
      ).rejects.toThrow("Authentication required");
    });

    it("throws when content is empty", async () => {
      const { askQuestion } = await import("./actions");
      await expect(
        askQuestion({
          sessionId: "sess-1",
          eventId: "evt-1",
          content: "   ",
        })
      ).rejects.toThrow("Question cannot be empty");
    });

    it("throws on supabase error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "Insert failed" } })
      );

      const { askQuestion } = await import("./actions");
      await expect(
        askQuestion({
          sessionId: "sess-1",
          eventId: "evt-1",
          content: "Valid question",
        })
      ).rejects.toThrow("Insert failed");
    });
  });

  describe("toggleUpvote", () => {
    it("removes upvote when one already exists", async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // select existing upvote — found
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
          // select existing upvote — not found
          return createQueryMock({ data: null, error: { code: "PGRST116" } });
        }
        // insert upvote
        return createQueryMock({ data: null, error: null });
      });

      const { toggleUpvote } = await import("./actions");
      const result = await toggleUpvote("q-1");

      expect(result).toEqual({ upvoted: true });
      expect(mockFrom).toHaveBeenCalledWith("question_upvotes");
    });

    it("throws when user is not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const { toggleUpvote } = await import("./actions");
      await expect(toggleUpvote("q-1")).rejects.toThrow("Authentication required");
    });
  });
});
