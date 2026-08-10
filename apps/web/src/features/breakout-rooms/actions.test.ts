import { describe, it, expect, vi, beforeEach } from "vitest";
import { revalidatePath } from "next/cache";

function createQueryMock(result: { data?: unknown; error?: unknown; count?: number | null }) {
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

describe("Breakout Room Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  describe("createRoom", () => {
    it("creates room and revalidates", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: { id: "room-1", title: "Discussion" }, error: null })
      );

      const { createRoom } = await import("./actions");
      const result = await createRoom("evt-1", {
        title: "Discussion",
        starts_at: "2026-09-01T10:00:00Z",
        ends_at: "2026-09-01T11:00:00Z",
      });

      expect(result).toHaveProperty("id", "room-1");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/rooms");
    });
  });

  describe("updateRoom", () => {
    it("updates and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updateRoom } = await import("./actions");
      await updateRoom("evt-1", "room-1", { title: "Updated" });

      expect(mockFrom).toHaveBeenCalledWith("breakout_rooms");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/rooms");
    });

    it("rejects invalid status", async () => {
      const { updateRoom } = await import("./actions");
      await expect(updateRoom("evt-1", "room-1", { status: "invalid" })).rejects.toThrow(
        "Invalid status"
      );
    });
  });

  describe("deleteRoom", () => {
    it("deletes and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { deleteRoom } = await import("./actions");
      await deleteRoom("evt-1", "room-1");

      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/rooms");
    });
  });

  describe("joinRoom", () => {
    it("joins open room", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1)
          return createQueryMock({
            data: { id: "room-1", max_capacity: null, status: "open", event_id: "evt-1" },
            error: null,
          });
        return createQueryMock({ data: null, error: null });
      });

      const { joinRoom } = await import("./actions");
      await joinRoom("room-1");

      expect(mockFrom).toHaveBeenCalledWith("breakout_room_participants");
    });

    it("rejects closed room", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({
          data: { id: "room-1", max_capacity: null, status: "closed", event_id: "evt-1" },
          error: null,
        })
      );

      const { joinRoom } = await import("./actions");
      await expect(joinRoom("room-1")).rejects.toThrow("closed");
    });

    it("rejects full room", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1)
          return createQueryMock({
            data: { id: "room-1", max_capacity: 2, status: "open", event_id: "evt-1" },
            error: null,
          });
        return createQueryMock({ data: null, error: null, count: 2 });
      });

      const { joinRoom } = await import("./actions");
      await expect(joinRoom("room-1")).rejects.toThrow("full");
    });
  });

  describe("leaveRoom", () => {
    it("leaves room and reopens if full", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1)
          return createQueryMock({
            data: { id: "room-1", event_id: "evt-1", status: "full", max_capacity: 2 },
            error: null,
          });
        return createQueryMock({ data: null, error: null });
      });

      const { leaveRoom } = await import("./actions");
      await leaveRoom("room-1");

      expect(mockFrom).toHaveBeenCalledWith("breakout_room_participants");
    });
  });
});
