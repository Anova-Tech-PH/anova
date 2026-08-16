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

describe("Community Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  describe("createTopic", () => {
    it("inserts a topic and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { createTopic } = await import("./actions");
      await createTopic("event-1", {
        title: "Hello World",
        type: "discussion",
        description: "A test topic",
      });

      expect(mockFrom).toHaveBeenCalledWith("community_topics");
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });

    it("throws when not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const { createTopic } = await import("./actions");
      await expect(
        createTopic("event-1", { title: "X", type: "discussion" })
      ).rejects.toThrow("Not authenticated");
    });

    it("throws on database error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "DB error" } })
      );

      const { createTopic } = await import("./actions");
      await expect(
        createTopic("event-1", { title: "X", type: "discussion" })
      ).rejects.toThrow();
    });
  });

  describe("deleteTopic", () => {
    it("deletes a topic and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { deleteTopic } = await import("./actions");
      await deleteTopic("topic-1");

      expect(mockFrom).toHaveBeenCalledWith("community_topics");
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });

    it("throws when not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const { deleteTopic } = await import("./actions");
      await expect(deleteTopic("topic-1")).rejects.toThrow("Not authenticated");
    });
  });

  describe("createPost", () => {
    it("inserts a post and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { createPost } = await import("./actions");
      await createPost("topic-1", "This is a reply");

      expect(mockFrom).toHaveBeenCalledWith("community_posts");
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });

    it("throws when content is empty", async () => {
      const { createPost } = await import("./actions");
      await expect(createPost("topic-1", "   ")).rejects.toThrow("Post cannot be empty");
    });

    it("throws when not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const { createPost } = await import("./actions");
      await expect(createPost("topic-1", "hello")).rejects.toThrow("Not authenticated");
    });
  });

  describe("deletePost", () => {
    it("deletes a post and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { deletePost } = await import("./actions");
      await deletePost("post-1");

      expect(mockFrom).toHaveBeenCalledWith("community_posts");
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });

    it("throws when not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const { deletePost } = await import("./actions");
      await expect(deletePost("post-1")).rejects.toThrow("Not authenticated");
    });
  });

  describe("toggleFollow", () => {
    it("adds follow when not already following", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1)
          return createQueryMock({ data: null, error: { code: "PGRST116" } });
        return createQueryMock({ data: null, error: null });
      });

      const { toggleFollow } = await import("./actions");
      await toggleFollow("topic-1");

      expect(mockFrom).toHaveBeenCalledWith("community_topic_follows");
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });

    it("removes follow when already following", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1)
          return createQueryMock({ data: { user_id: "user-1" }, error: null });
        return createQueryMock({ data: null, error: null });
      });

      const { toggleFollow } = await import("./actions");
      await toggleFollow("topic-1");

      expect(revalidatePath).toHaveBeenCalledWith("/");
    });

    it("throws when not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const { toggleFollow } = await import("./actions");
      await expect(toggleFollow("topic-1")).rejects.toThrow("Not authenticated");
    });
  });

  describe("toggleReaction", () => {
    it("adds reaction when not already reacted", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1)
          return createQueryMock({ data: null, error: { code: "PGRST116" } });
        return createQueryMock({ data: null, error: null });
      });

      const { toggleReaction } = await import("./actions");
      await toggleReaction("post-1", "👍");

      expect(mockFrom).toHaveBeenCalledWith("community_post_reactions");
      expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("removes reaction when already reacted", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1)
          return createQueryMock({ data: { user_id: "user-1" }, error: null });
        return createQueryMock({ data: null, error: null });
      });

      const { toggleReaction } = await import("./actions");
      await toggleReaction("post-1", "👍");

      expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("throws when not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const { toggleReaction } = await import("./actions");
      await expect(toggleReaction("post-1", "👍")).rejects.toThrow("Not authenticated");
    });
  });

  describe("markTopicRead", () => {
    it("upserts read status and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { markTopicRead } = await import("./actions");
      await markTopicRead("topic-1");

      expect(mockFrom).toHaveBeenCalledWith("community_topic_read_status");
      expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("throws when not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const { markTopicRead } = await import("./actions");
      await expect(markTopicRead("topic-1")).rejects.toThrow("Not authenticated");
    });
  });

  describe("submitIcebreaker", () => {
    it("upserts icebreaker response and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { submitIcebreaker } = await import("./actions");
      await submitIcebreaker("event-1", {
        introduction: "Hi, I'm Alice",
        answer: "Option A",
      });

      expect(mockFrom).toHaveBeenCalledWith("icebreaker_responses");
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });

    it("throws when not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const { submitIcebreaker } = await import("./actions");
      await expect(
        submitIcebreaker("event-1", { introduction: "Hi", answer: "A" })
      ).rejects.toThrow("Not authenticated");
    });
  });
});
