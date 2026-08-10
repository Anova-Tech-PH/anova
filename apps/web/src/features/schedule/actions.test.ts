import { describe, it, expect, vi, beforeEach } from "vitest";
import { revalidatePath } from "next/cache";

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
  getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
};

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom, auth: mockAuth })),
}));

describe("Schedule Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createTrack", () => {
    it("creates track with next sort order and revalidates", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) return createQueryMock({ data: [{ sort_order: 2 }], error: null });
        return createQueryMock({ data: { id: "track-1", name: "Main", sort_order: 3 }, error: null });
      });

      const { createTrack } = await import("./actions");
      const result = await createTrack("evt-1", { name: "Main", color: "#FF0000" });

      expect(result).toHaveProperty("id", "track-1");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/schedule");
    });
  });

  describe("updateTrack", () => {
    it("updates track and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updateTrack } = await import("./actions");
      await updateTrack("evt-1", "track-1", { name: "Updated", color: "#00FF00" });

      expect(mockFrom).toHaveBeenCalledWith("tracks");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/schedule");
    });
  });

  describe("deleteTrack", () => {
    it("deletes track and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { deleteTrack } = await import("./actions");
      await deleteTrack("evt-1", "track-1");

      expect(mockFrom).toHaveBeenCalledWith("tracks");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/schedule");
    });
  });

  describe("createSession", () => {
    it("creates session and revalidates", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: { id: "sess-1", title: "Talk" }, error: null })
      );

      const { createSession } = await import("./actions");
      const result = await createSession("evt-1", {
        title: "Talk",
        type: "talk",
        start_time: "2026-01-01T10:00:00Z",
        end_time: "2026-01-01T11:00:00Z",
      });

      expect(result).toHaveProperty("id", "sess-1");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/schedule");
    });

    it("links speakers when provided", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) return createQueryMock({ data: { id: "sess-1" }, error: null });
        return createQueryMock({ data: null, error: null }); // session_speakers insert
      });

      const { createSession } = await import("./actions");
      await createSession("evt-1", {
        title: "Talk",
        type: "talk",
        start_time: "2026-01-01T10:00:00Z",
        end_time: "2026-01-01T11:00:00Z",
        speaker_ids: ["spk-1", "spk-2"],
      });

      expect(mockFrom).toHaveBeenCalledWith("session_speakers");
    });

    it("throws on error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "Missing title" } })
      );

      const { createSession } = await import("./actions");
      await expect(
        createSession("evt-1", {
          title: "",
          type: "talk",
          start_time: "2026-01-01T10:00:00Z",
          end_time: "2026-01-01T11:00:00Z",
        })
      ).rejects.toThrow("Missing title");
    });
  });

  describe("updateSession", () => {
    it("updates session fields and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updateSession } = await import("./actions");
      await updateSession("evt-1", "sess-1", { title: "Updated Talk" });

      expect(mockFrom).toHaveBeenCalledWith("sessions");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/schedule");
    });

    it("handles capacity and rsvp_enabled fields", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updateSession } = await import("./actions");
      await updateSession("evt-1", "sess-1", {
        capacity: 50,
        rsvp_enabled: true,
      });

      expect(mockFrom).toHaveBeenCalledWith("sessions");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/schedule");
    });
  });

  describe("deleteSession", () => {
    it("deletes session and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { deleteSession } = await import("./actions");
      await deleteSession("evt-1", "sess-1");

      expect(mockFrom).toHaveBeenCalledWith("sessions");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/schedule");
    });
  });
});
