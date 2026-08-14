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
const mockRpc = vi.fn();
const mockAuth = {
  getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
};

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom, rpc: mockRpc, auth: mockAuth })),
}));

vi.mock("@/features/gamification/award", () => ({
  tryAwardPoints: vi.fn().mockResolvedValue({ points: 0, newBadges: [] }),
}));

describe("RSVP Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rsvpToSession", () => {
    it("calls RPC and returns confirmed", async () => {
      mockRpc.mockResolvedValue({ data: "confirmed", error: null });
      mockFrom.mockReturnValue(createQueryMock({ data: { event_id: "evt-1" }, error: null }));

      const { rsvpToSession } = await import("./actions");
      const result = await rsvpToSession("sess-1");

      expect(mockRpc).toHaveBeenCalledWith("rsvp_to_session", {
        _session_id: "sess-1",
      });
      expect(result).toBe("confirmed");
    });

    it("returns waitlisted when at capacity", async () => {
      mockRpc.mockResolvedValue({ data: "waitlisted", error: null });
      mockFrom.mockReturnValue(createQueryMock({ data: { event_id: "evt-1" }, error: null }));

      const { rsvpToSession } = await import("./actions");
      const result = await rsvpToSession("sess-1");

      expect(result).toBe("waitlisted");
    });

    it("throws on RPC error", async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: "RPC failed" } });

      const { rsvpToSession } = await import("./actions");
      await expect(rsvpToSession("sess-1")).rejects.toThrow("RPC failed");
    });
  });

  describe("cancelRsvp", () => {
    it("calls cancel RPC", async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      const { cancelRsvp } = await import("./actions");
      await cancelRsvp("sess-1");

      expect(mockRpc).toHaveBeenCalledWith("cancel_session_rsvp", {
        _session_id: "sess-1",
      });
    });
  });

  describe("updateSessionCapacity", () => {
    it("updates capacity and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updateSessionCapacity } = await import("./actions");
      await updateSessionCapacity("evt-1", "sess-1", {
        capacity: 50,
        rsvp_enabled: true,
      });

      expect(mockFrom).toHaveBeenCalledWith("sessions");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/schedule");
    });
  });
});
