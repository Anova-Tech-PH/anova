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

describe("Social Group Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "me@test.com" } },
      error: null,
    });
  });

  describe("createGroup", () => {
    it("creates group and revalidates", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({
          data: { id: "group-1", title: "My Group" },
          error: null,
        })
      );

      const { createGroup } = await import("./actions");
      const result = await createGroup("evt-1", {
        title: "My Group",
        description: "A social group",
      });

      expect(result).toHaveProperty("id", "group-1");
      expect(mockFrom).toHaveBeenCalledWith("social_groups");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/social-groups");
    });

    it("throws when not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const { createGroup } = await import("./actions");
      await expect(
        createGroup("evt-1", { title: "Test" })
      ).rejects.toThrow("Authentication required");
    });
  });

  describe("updateGroup", () => {
    it("updates group and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updateGroup } = await import("./actions");
      await updateGroup("evt-1", "group-1", { title: "Updated Title" });

      expect(mockFrom).toHaveBeenCalledWith("social_groups");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/social-groups");
    });
  });

  describe("deleteGroup", () => {
    it("deletes group and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { deleteGroup } = await import("./actions");
      await deleteGroup("evt-1", "group-1");

      expect(mockFrom).toHaveBeenCalledWith("social_groups");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/social-groups");
    });
  });
});
