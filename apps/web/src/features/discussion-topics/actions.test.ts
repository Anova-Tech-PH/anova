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

  describe("importTopics", () => {
    it("imports multiple topics with correct fields", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({
          data: [
            { id: "new-1", title: "Topic A", is_built_in: false },
            { id: "new-2", title: "Topic B", is_built_in: false },
          ],
          error: null,
        })
      );

      const { importTopics } = await import("./actions");
      const result = await importTopics("evt-1", [
        { title: "Topic A", description: "Desc A" },
        { title: "Topic B", description: null },
      ]);

      expect(mockFrom).toHaveBeenCalledWith("discussion_topics");
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("is_built_in", false);
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/discussion-topics");
    });

    it("sets is_built_in=false, created_by, and event_id", async () => {
      // Track what gets passed to insert
      let insertedRows: unknown[] = [];
      const insertMock = vi.fn((rows: unknown[]) => {
        insertedRows = rows;
        return {
          select: vi.fn(() => ({
            then: (resolve: (v: unknown) => void) =>
              resolve({
                data: rows.map((r: Record<string, unknown>, i: number) => ({
                  id: `new-${i}`,
                  ...r,
                })),
                error: null,
              }),
          })),
        };
      });
      mockFrom.mockReturnValue({ insert: insertMock });

      const { importTopics } = await import("./actions");
      await importTopics("evt-1", [
        { title: "Imported Topic", description: "A description" },
      ]);

      expect(insertedRows).toHaveLength(1);
      expect(insertedRows[0]).toMatchObject({
        event_id: "evt-1",
        created_by: "user-1",
        is_built_in: false,
        title: "Imported Topic",
        description: "A description",
      });
    });

    it("throws when not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const { importTopics } = await import("./actions");
      await expect(
        importTopics("evt-1", [{ title: "Test", description: null }])
      ).rejects.toThrow("Authentication required");
    });
  });
});
