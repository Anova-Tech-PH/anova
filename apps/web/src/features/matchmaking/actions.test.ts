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

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Matchmaking Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "me@test.com" } },
      error: null,
    });
  });

  describe("createInterest", () => {
    it("creates interest and revalidates", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({
          data: { id: "interest-1", name: "AI" },
          error: null,
        })
      );

      const { createInterest } = await import("./actions");
      await createInterest("evt-1", { name: "AI" });

      expect(mockFrom).toHaveBeenCalledWith("event_interests");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/matchmaking");
    });

    it("throws when not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const { createInterest } = await import("./actions");
      await expect(
        createInterest("evt-1", { name: "AI" })
      ).rejects.toThrow("Not authenticated");
    });
  });

  describe("updateInterest", () => {
    it("updates interest and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updateInterest } = await import("./actions");
      await updateInterest("evt-1", "interest-1", { name: "Machine Learning" });

      expect(mockFrom).toHaveBeenCalledWith("event_interests");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/matchmaking");
    });
  });

  describe("deleteInterest", () => {
    it("deletes interest and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { deleteInterest } = await import("./actions");
      await deleteInterest("evt-1", "interest-1");

      expect(mockFrom).toHaveBeenCalledWith("event_interests");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/matchmaking");
    });
  });
});
