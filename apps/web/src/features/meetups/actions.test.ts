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
  getUser: vi.fn().mockResolvedValue({
    data: { user: { id: "user-1", email: "me@test.com" } },
    error: null,
  }),
};

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom, rpc: mockRpc, auth: mockAuth })),
}));

describe("Meetup Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "me@test.com" } },
      error: null,
    });
  });

  describe("createMeetup", () => {
    it("creates meetup and revalidates", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({
          data: { id: "meetup-1", title: "Prayer Time", status: "active" },
          error: null,
        })
      );

      const { createMeetup } = await import("./actions");
      const result = await createMeetup("evt-1", {
        title: "Prayer Time",
        description: "Evening prayer",
        starts_at: "2025-11-02T18:00:00Z",
      });

      expect(result).toHaveProperty("id", "meetup-1");
      expect(mockFrom).toHaveBeenCalledWith("meetups");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/meetups");
    });

    it("throws when not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const { createMeetup } = await import("./actions");
      await expect(
        createMeetup("evt-1", { title: "Test", starts_at: "2025-11-02T18:00:00Z" })
      ).rejects.toThrow("Authentication required");
    });
  });

  describe("updateMeetup", () => {
    it("updates meetup and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updateMeetup } = await import("./actions");
      await updateMeetup("evt-1", "meetup-1", { title: "Updated Title" });

      expect(mockFrom).toHaveBeenCalledWith("meetups");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/meetups");
    });
  });

  describe("deleteMeetup", () => {
    it("deletes meetup and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { deleteMeetup } = await import("./actions");
      await deleteMeetup("evt-1", "meetup-1");

      expect(mockFrom).toHaveBeenCalledWith("meetups");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/meetups");
    });
  });

  describe("rsvpToMeetup", () => {
    it("calls rpc and returns status", async () => {
      mockRpc.mockResolvedValue({ data: "confirmed", error: null });

      const { rsvpToMeetup } = await import("./actions");
      const status = await rsvpToMeetup("meetup-1");

      expect(status).toBe("confirmed");
      expect(mockRpc).toHaveBeenCalledWith("rsvp_to_meetup", { _meetup_id: "meetup-1" });
    });
  });

  describe("cancelMeetupRsvp", () => {
    it("calls rpc to cancel", async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      const { cancelMeetupRsvp } = await import("./actions");
      await cancelMeetupRsvp("meetup-1");

      expect(mockRpc).toHaveBeenCalledWith("cancel_meetup_rsvp", { _meetup_id: "meetup-1" });
    });
  });
});
