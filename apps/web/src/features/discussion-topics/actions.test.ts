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
  getUser: vi.fn().mockResolvedValue({
    data: { user: { id: "user-1", email: "me@test.com" } },
    error: null,
  }),
};

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom, auth: mockAuth })),
}));

describe("Discussion Topic Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "me@test.com" } },
      error: null,
    });
  });

  describe("createTopic", () => {
    it("creates topic and revalidates", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({
          data: { id: "topic-1", title: "My Topic", is_built_in: false },
          error: null,
        })
      );

      const { createTopic } = await import("./actions");
      const result = await createTopic("evt-1", {
        title: "My Topic",
        description: "A custom topic",
      });

      expect(result).toHaveProperty("id", "topic-1");
      expect(mockFrom).toHaveBeenCalledWith("discussion_topics");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/discussion-topics");
    });

    it("throws when not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const { createTopic } = await import("./actions");
      await expect(
        createTopic("evt-1", { title: "Test" })
      ).rejects.toThrow("Authentication required");
    });
  });

  describe("updateTopic", () => {
    it("updates topic and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updateTopic } = await import("./actions");
      await updateTopic("evt-1", "topic-1", { title: "Updated Title" });

      expect(mockFrom).toHaveBeenCalledWith("discussion_topics");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/discussion-topics");
    });
  });

  describe("deleteTopic", () => {
    it("deletes topic and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { deleteTopic } = await import("./actions");
      await deleteTopic("evt-1", "topic-1");

      expect(mockFrom).toHaveBeenCalledWith("discussion_topics");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/discussion-topics");
    });
  });

  describe("toggleTopicVisibility", () => {
    it("toggles visibility and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { toggleTopicVisibility } = await import("./actions");
      await toggleTopicVisibility("evt-1", "topic-1", false);

      expect(mockFrom).toHaveBeenCalledWith("discussion_topics");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/discussion-topics");
    });
  });

  describe("seedBuiltInTopics", () => {
    it("inserts missing built-in topics", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: [], error: null })
      );

      const { seedBuiltInTopics } = await import("./actions");
      await seedBuiltInTopics("evt-1");

      expect(mockFrom).toHaveBeenCalledWith("discussion_topics");
    });
  });
});
