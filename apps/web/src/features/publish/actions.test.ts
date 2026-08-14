import { describe, it, expect, vi, beforeEach } from "vitest";
import { revalidatePath } from "next/cache";
import { publishEvent, unpublishEvent } from "./actions";

function createQueryMock(result: { data?: unknown; error?: unknown }) {
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) => resolve(result);
      }
      return vi.fn(() => new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

const mockFrom = vi.fn();

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

describe("Publish Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("publishEvent", () => {
    it("updates status to published and revalidates paths", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      await publishEvent("event-1");

      expect(mockFrom).toHaveBeenCalledWith("events");
      expect(revalidatePath).toHaveBeenCalledWith("/events/event-1");
      expect(revalidatePath).toHaveBeenCalledWith("/events");
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    });

    it("throws on supabase error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "Forbidden" } })
      );

      await expect(publishEvent("bad-id")).rejects.toThrow();
    });
  });

  describe("unpublishEvent", () => {
    it("updates status to draft and revalidates paths", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      await unpublishEvent("event-1");

      expect(mockFrom).toHaveBeenCalledWith("events");
      expect(revalidatePath).toHaveBeenCalledWith("/events/event-1");
      expect(revalidatePath).toHaveBeenCalledWith("/events");
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    });

    it("throws on supabase error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "Denied" } })
      );

      await expect(unpublishEvent("bad-id")).rejects.toThrow();
    });
  });
});
