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

describe("Speaker Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSpeaker", () => {
    it("creates speaker and revalidates", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: { id: "spk-1", name: "Jane" }, error: null })
      );

      const { createSpeaker } = await import("./actions");
      const result = await createSpeaker("evt-1", { name: "Jane", title: "CEO" });

      expect(result).toHaveProperty("name", "Jane");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/schedule");
    });

    it("creates speaker with social links and featured flag", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({
          data: {
            id: "spk-2",
            name: "John",
            linkedin_url: "https://linkedin.com/in/john",
            twitter_handle: "@john",
            website_url: "https://john.dev",
            is_featured: true,
            sort_order: 1,
          },
          error: null,
        })
      );

      const { createSpeaker } = await import("./actions");
      const result = await createSpeaker("evt-1", {
        name: "John",
        linkedin_url: "https://linkedin.com/in/john",
        twitter_handle: "@john",
        website_url: "https://john.dev",
        is_featured: true,
        sort_order: 1,
      });

      expect(result).toHaveProperty("linkedin_url", "https://linkedin.com/in/john");
      expect(result).toHaveProperty("twitter_handle", "@john");
      expect(result).toHaveProperty("website_url", "https://john.dev");
      expect(result).toHaveProperty("is_featured", true);
      expect(result).toHaveProperty("sort_order", 1);
      expect(mockFrom).toHaveBeenCalledWith("speakers");
    });

    it("creates speaker with defaults when optional fields omitted", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({
          data: {
            id: "spk-3",
            name: "MinimalSpeaker",
            linkedin_url: null,
            twitter_handle: null,
            website_url: null,
            is_featured: false,
            sort_order: null,
          },
          error: null,
        })
      );

      const { createSpeaker } = await import("./actions");
      const result = await createSpeaker("evt-1", { name: "MinimalSpeaker" });

      expect(result).toHaveProperty("name", "MinimalSpeaker");
      expect(result).toHaveProperty("is_featured", false);
      expect(result).toHaveProperty("linkedin_url", null);
    });
  });

  describe("updateSpeaker", () => {
    it("updates and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updateSpeaker } = await import("./actions");
      await updateSpeaker("evt-1", "spk-1", { name: "Updated" });

      expect(mockFrom).toHaveBeenCalledWith("speakers");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/schedule");
    });
  });

  describe("deleteSpeaker", () => {
    it("deletes and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { deleteSpeaker } = await import("./actions");
      await deleteSpeaker("evt-1", "spk-1");

      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/schedule");
    });
  });

  describe("bulkImportSpeakers", () => {
    it("bulk imports multiple rows", async () => {
      const importedSpeakers = [
        { id: "spk-10", name: "Alice", email: "alice@test.com" },
        { id: "spk-11", name: "Bob", email: "bob@test.com" },
      ];
      mockFrom.mockReturnValue(
        createQueryMock({ data: importedSpeakers, error: null })
      );

      const { bulkImportSpeakers } = await import("./actions");
      const result = await bulkImportSpeakers("evt-1", [
        { name: "Alice", email: "alice@test.com" },
        { name: "Bob", email: "bob@test.com" },
      ]);

      expect(result).toHaveLength(2);
      expect(result![0]).toHaveProperty("name", "Alice");
      expect(mockFrom).toHaveBeenCalledWith("speakers");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/schedule");
    });

    it("throws on empty array", async () => {
      const { bulkImportSpeakers } = await import("./actions");

      await expect(bulkImportSpeakers("evt-1", [])).rejects.toThrow(
        "No rows to import"
      );
    });
  });
});
