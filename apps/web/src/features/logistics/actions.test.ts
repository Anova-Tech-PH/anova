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

describe("Logistics Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateLogistics", () => {
    it("updates venue fields and revalidates", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: null })
      );

      const { updateLogistics } = await import("./actions");
      await updateLogistics("evt-1", {
        venue_description: "Main hall downtown",
        venue_map_url: "https://maps.google.com/embed?pb=123",
      });

      expect(mockFrom).toHaveBeenCalledWith("events");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/logistics");
    });

    it("merges logistics JSONB with existing data", async () => {
      // First call: select existing logistics; Second call: update
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // select call to fetch existing
          return createQueryMock({
            data: { logistics: { wifi: { network: "OldNet", password: "old" }, parking: { title: "Lot A", body: "Free" } } },
            error: null,
          });
        }
        // update call
        return createQueryMock({ data: null, error: null });
      });

      const { updateLogistics } = await import("./actions");
      await updateLogistics("evt-1", {
        logistics: { wifi: { network: "NewNet", password: "new123" } },
      });

      expect(mockFrom).toHaveBeenCalledWith("events");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/logistics");
    });
  });
});
