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

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

describe("Tier Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createTier", () => {
    it("creates tier and revalidates", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: { id: "tier-1", name: "Gold" }, error: null })
      );

      const { createTier } = await import("./tier-actions");
      const result = await createTier("evt-1", { name: "Gold" });

      expect(result).toHaveProperty("name", "Gold");
      expect(mockFrom).toHaveBeenCalledWith("sponsor_tiers");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/sponsors");
    });

    it("throws on error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "Insert failed" } })
      );

      const { createTier } = await import("./tier-actions");
      await expect(createTier("evt-1", { name: "Gold" })).rejects.toThrow("Insert failed");
    });
  });

  describe("updateTier", () => {
    it("updates tier and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updateTier } = await import("./tier-actions");
      await updateTier("evt-1", "tier-1", { name: "Platinum" });

      expect(mockFrom).toHaveBeenCalledWith("sponsor_tiers");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/sponsors");
    });
  });

  describe("deleteTier", () => {
    it("deletes tier and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { deleteTier } = await import("./tier-actions");
      await deleteTier("evt-1", "tier-1");

      expect(mockFrom).toHaveBeenCalledWith("sponsor_tiers");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/sponsors");
    });
  });
});
