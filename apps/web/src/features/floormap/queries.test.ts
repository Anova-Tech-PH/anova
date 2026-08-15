import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Supabase server client
const mockSingle = vi.fn();
const mockNot = vi.fn(() => ({ data: [], error: null }));
const mockOrder = vi.fn(() => ({ data: [], error: null }));
const mockEq = vi.fn((col: string, val: string) => ({
  order: mockOrder,
  single: mockSingle,
  not: mockNot,
}));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));
const mockSupabase = { from: mockFrom };

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

describe("floormap queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrder.mockReturnValue({ data: [], error: null });
    mockSingle.mockReturnValue({ data: null, error: null });
    mockNot.mockReturnValue({ data: [], error: null });
  });

  describe("getFloormapsByEvent", () => {
    it("is exported and is a function", async () => {
      const { getFloormapsByEvent } = await import("./queries");
      expect(getFloormapsByEvent).toBeDefined();
      expect(typeof getFloormapsByEvent).toBe("function");
    });

    it("queries floormaps table filtered by event_id and ordered by display_order", async () => {
      const mockData = [
        { id: "1", name: "Main Hall", image_url: "/img.png", display_order: 1, created_at: "2026-01-01" },
      ];
      mockOrder.mockReturnValue({ data: mockData, error: null });

      const { getFloormapsByEvent } = await import("./queries");
      const result = await getFloormapsByEvent("event-123");

      expect(mockFrom).toHaveBeenCalledWith("floormaps");
      expect(mockSelect).toHaveBeenCalledWith("id, name, image_url, display_order, created_at");
      expect(mockEq).toHaveBeenCalledWith("event_id", "event-123");
      expect(mockOrder).toHaveBeenCalledWith("display_order");
      expect(result).toEqual(mockData);
    });

    it("throws on error", async () => {
      mockOrder.mockReturnValue({ data: null, error: { message: "fail" } });

      const { getFloormapsByEvent } = await import("./queries");
      await expect(getFloormapsByEvent("event-123")).rejects.toEqual({ message: "fail" });
    });
  });

  describe("getFloormapWithMarkers", () => {
    it("is exported and is a function", async () => {
      const { getFloormapWithMarkers } = await import("./queries");
      expect(getFloormapWithMarkers).toBeDefined();
      expect(typeof getFloormapWithMarkers).toBe("function");
    });

    it("queries a single floormap with its markers", async () => {
      const mockData = {
        id: "fm-1",
        name: "Hall A",
        image_url: "/hall.png",
        event_id: "ev-1",
        floormap_markers: [{ id: "m1", label: "Stage", x: 0.5, y: 0.3 }],
      };
      mockSingle.mockReturnValue({ data: mockData, error: null });

      const { getFloormapWithMarkers } = await import("./queries");
      const result = await getFloormapWithMarkers("fm-1");

      expect(mockFrom).toHaveBeenCalledWith("floormaps");
      expect(mockSelect).toHaveBeenCalledWith(
        "id, name, image_url, event_id, floormap_markers(id, label, x, y)"
      );
      expect(mockEq).toHaveBeenCalledWith("id", "fm-1");
      expect(mockSingle).toHaveBeenCalled();
      expect(result).toEqual(mockData);
    });
  });

  describe("getEventLocations", () => {
    it("is exported and is a function", async () => {
      const { getEventLocations } = await import("./queries");
      expect(getEventLocations).toBeDefined();
      expect(typeof getEventLocations).toBe("function");
    });

    it("returns unique non-null locations from sessions", async () => {
      const mockData = [
        { location: "Room A" },
        { location: "Room B" },
        { location: "Room A" },
      ];
      mockNot.mockReturnValue({ data: mockData, error: null });

      const { getEventLocations } = await import("./queries");
      const result = await getEventLocations("event-123");

      expect(mockFrom).toHaveBeenCalledWith("sessions");
      expect(mockSelect).toHaveBeenCalledWith("location");
      expect(mockEq).toHaveBeenCalledWith("event_id", "event-123");
      expect(result).toEqual(["Room A", "Room B"]);
    });
  });

  describe("type exports", () => {
    it("exports Floormap and FloormapWithMarkers types", async () => {
      // TypeScript type exports can't be checked at runtime,
      // but we verify the module loads without error and the
      // type-generating functions exist (types are derived from them).
      const mod = await import("./queries");
      expect(mod.getFloormapsByEvent).toBeDefined();
      expect(mod.getFloormapWithMarkers).toBeDefined();
    });
  });
});
