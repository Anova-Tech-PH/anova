import { describe, it, expect, vi, beforeEach } from "vitest";

function createQueryMock(result: { data?: unknown; count?: number | null; error?: unknown }) {
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

describe("Attendee Profile Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  describe("getAttendeeDirectory", () => {
    it("returns paginated profiles", async () => {
      const mockProfiles = [
        { id: "u-2", display_name: "Alice", event_id: "event-1" },
        { id: "u-3", display_name: "Bob", event_id: "event-1" },
      ];
      mockFrom.mockReturnValue(
        createQueryMock({ data: mockProfiles, count: 2, error: null })
      );

      const { getAttendeeDirectory } = await import("./queries");
      const result = await getAttendeeDirectory("event-1");

      expect(result.profiles).toEqual(mockProfiles);
      expect(result.total).toBe(2);
      expect(mockFrom).toHaveBeenCalledWith("attendee_profiles");
    });

    it("supports search filter", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: [], count: 0, error: null })
      );

      const { getAttendeeDirectory } = await import("./queries");
      const result = await getAttendeeDirectory("event-1", { search: "alice" });

      expect(result.profiles).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("returns empty for bookmarked tab with no bookmarks", async () => {
      // First call: bookmarks query returns empty
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) {
          return createQueryMock({ data: [], error: null });
        }
        return createQueryMock({ data: [], count: 0, error: null });
      });

      const { getAttendeeDirectory } = await import("./queries");
      const result = await getAttendeeDirectory("event-1", { tab: "bookmarked" });

      expect(result.profiles).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("throws when not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const { getAttendeeDirectory } = await import("./queries");
      await expect(getAttendeeDirectory("event-1")).rejects.toThrow("Not authenticated");
    });

    it("throws on database error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, count: null, error: { message: "DB error" } })
      );

      const { getAttendeeDirectory } = await import("./queries");
      await expect(getAttendeeDirectory("event-1")).rejects.toThrow();
    });
  });

  describe("getAttendeeProfile", () => {
    it("returns profile with interests", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) {
          return createQueryMock({
            data: { id: "u-2", display_name: "Alice", event_id: "event-1" },
            error: null,
          });
        }
        return createQueryMock({
          data: [
            { interest_id: "i-1", event_interests: { id: "i-1", name: "AI" } },
          ],
          error: null,
        });
      });

      const { getAttendeeProfile } = await import("./queries");
      const result = await getAttendeeProfile("event-1", "u-2");

      expect(result.display_name).toBe("Alice");
      expect(result.interests).toEqual([{ id: "i-1", name: "AI" }]);
    });

    it("throws on database error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "Not found" } })
      );

      const { getAttendeeProfile } = await import("./queries");
      await expect(getAttendeeProfile("event-1", "u-2")).rejects.toThrow();
    });
  });

  describe("getMyProfile", () => {
    it("returns current user profile", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({
          data: { id: "user-1", display_name: "Me", event_id: "event-1" },
          error: null,
        })
      );

      const { getMyProfile } = await import("./queries");
      const result = await getMyProfile("event-1");

      expect(result).toEqual({ id: "user-1", display_name: "Me", event_id: "event-1" });
      expect(mockFrom).toHaveBeenCalledWith("attendee_profiles");
    });

    it("returns null when not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const { getMyProfile } = await import("./queries");
      const result = await getMyProfile("event-1");

      expect(result).toBeNull();
    });
  });

  describe("getBookmarkedAttendeeIds", () => {
    it("returns list of bookmarked user IDs", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({
          data: [
            { bookmarked_user_id: "u-2" },
            { bookmarked_user_id: "u-3" },
          ],
          error: null,
        })
      );

      const { getBookmarkedAttendeeIds } = await import("./queries");
      const result = await getBookmarkedAttendeeIds("event-1");

      expect(result).toEqual(["u-2", "u-3"]);
      expect(mockFrom).toHaveBeenCalledWith("attendee_bookmarks");
    });

    it("returns empty array when not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const { getBookmarkedAttendeeIds } = await import("./queries");
      const result = await getBookmarkedAttendeeIds("event-1");

      expect(result).toEqual([]);
    });
  });
});
