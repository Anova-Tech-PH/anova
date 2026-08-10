import { describe, it, expect, vi, beforeEach } from "vitest";
import { revalidatePath } from "next/cache";

// Chainable mock builder for Supabase queries
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
const mockAuth = {
  getUser: vi.fn().mockResolvedValue({
    data: { user: { id: "user-1" } },
    error: null,
  }),
};

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ from: mockFrom, auth: mockAuth })
  ),
}));

describe("Event Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
  });

  describe("updateEventStatus", () => {
    it("updates status and revalidates paths", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updateEventStatus } = await import("./actions");
      await updateEventStatus("event-1", "published");

      expect(mockFrom).toHaveBeenCalledWith("events");
      expect(revalidatePath).toHaveBeenCalledWith("/events/event-1");
      expect(revalidatePath).toHaveBeenCalledWith("/events");
    });

    it("throws on supabase error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "Not found" } })
      );

      const { updateEventStatus } = await import("./actions");
      await expect(updateEventStatus("bad-id", "published")).rejects.toThrow();
    });
  });

  describe("deleteEvent", () => {
    it("deletes and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { deleteEvent } = await import("./actions");
      await deleteEvent("event-1");

      expect(mockFrom).toHaveBeenCalledWith("events");
      expect(revalidatePath).toHaveBeenCalledWith("/events");
    });

    it("throws on error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "Failed" } })
      );

      const { deleteEvent } = await import("./actions");
      await expect(deleteEvent("bad")).rejects.toThrow();
    });
  });

  describe("duplicateEvent", () => {
    it("creates copy of event and returns new id", async () => {
      const original = {
        id: "evt-1",
        organization_id: "org-1",
        title: "Original",
        slug: "original",
        description: null,
        start_date: "2026-01-01",
        end_date: "2026-01-02",
        timezone: "UTC",
        venue_name: null,
        venue_address: null,
        is_virtual: false,
        virtual_url: null,
        cover_image: null,
        status: "published",
        theme: null,
        settings: null,
      };

      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) return createQueryMock({ data: original, error: null }); // fetch original
        if (callIdx === 2) return createQueryMock({ data: { role: "owner" }, error: null }); // membership check
        if (callIdx === 3) return createQueryMock({ data: { id: "evt-2" }, error: null }); // insert new event
        return createQueryMock({ data: [], error: null }); // clone sub-entities
      });

      const { duplicateEvent } = await import("./actions");
      const result = await duplicateEvent("evt-1");

      expect(result).toEqual({ id: "evt-2" });
      expect(revalidatePath).toHaveBeenCalledWith("/events");
    });

    it("throws when event not found", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "Not found" } })
      );

      const { duplicateEvent } = await import("./actions");
      await expect(duplicateEvent("missing")).rejects.toThrow("Event not found");
    });

    it("throws when not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { duplicateEvent } = await import("./actions");
      await expect(duplicateEvent("evt-1")).rejects.toThrow("Not authenticated");
    });
  });
});
