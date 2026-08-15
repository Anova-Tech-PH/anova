import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase server client
vi.mock("@attendly/ui/supabase/server", () => {
  const chainable = () => {
    const obj: Record<string, unknown> = {
      select: () => obj,
      eq: () => obj,
      neq: () => obj,
      gte: () => obj,
      lte: () => obj,
      in: () => obj,
      order: () => obj,
      limit: () => obj,
      single: () => Promise.resolve({ data: null, error: null }),
      then: (resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null }),
    };
    return obj;
  };

  const supabaseClient = {
    from: () => chainable(),
  };

  return {
    createClient: vi.fn(() => Promise.resolve(supabaseClient)),
  };
});

describe("announcement-wall/queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports getWallConfig", async () => {
    const { getWallConfig } = await import("./queries");
    expect(getWallConfig).toBeDefined();
    expect(typeof getWallConfig).toBe("function");
  });

  it("exports getDefaultConfig", async () => {
    const { getDefaultConfig } = await import("./queries");
    expect(getDefaultConfig).toBeDefined();
    expect(typeof getDefaultConfig).toBe("function");
  });

  it("exports getCustomSlides", async () => {
    const { getCustomSlides } = await import("./queries");
    expect(getCustomSlides).toBeDefined();
    expect(typeof getCustomSlides).toBe("function");
  });

  it("exports getAllCustomSlides", async () => {
    const { getAllCustomSlides } = await import("./queries");
    expect(getAllCustomSlides).toBeDefined();
    expect(typeof getAllCustomSlides).toBe("function");
  });

  it("exports getWallData", async () => {
    const { getWallData } = await import("./queries");
    expect(getWallData).toBeDefined();
    expect(typeof getWallData).toBe("function");
  });

  it("getDefaultConfig returns sensible defaults", async () => {
    const { getDefaultConfig } = await import("./queries");
    const defaults = getDefaultConfig();
    expect(defaults.enabled).toBe(false);
    expect(defaults.rotation_speed).toBe(10);
    expect(defaults.theme).toBe("dark");
    expect(defaults.show_event_overview).toBe(true);
    expect(defaults.show_announcements).toBe(true);
    expect(defaults.show_upcoming_sessions).toBe(true);
    expect(defaults.show_sponsors).toBe(true);
    expect(defaults.show_polls).toBe(true);
    expect(defaults.show_custom_slides).toBe(true);
    expect(defaults.session_lookahead_minutes).toBe(120);
  });

  it("getWallConfig returns null when no config exists", async () => {
    const { getWallConfig } = await import("./queries");
    const result = await getWallConfig("nonexistent-event-id");
    expect(result).toBeNull();
  });

  it("getCustomSlides returns an array", async () => {
    const { getCustomSlides } = await import("./queries");
    const result = await getCustomSlides("some-event-id");
    expect(Array.isArray(result)).toBe(true);
  });

  it("getAllCustomSlides returns an array", async () => {
    const { getAllCustomSlides } = await import("./queries");
    const result = await getAllCustomSlides("some-event-id");
    expect(Array.isArray(result)).toBe(true);
  });

  it("getWallData returns aggregated data object", async () => {
    const { getWallData } = await import("./queries");
    const result = await getWallData("some-event-id");
    expect(result).toHaveProperty("config");
    expect(result).toHaveProperty("customSlides");
    expect(result).toHaveProperty("announcements");
    expect(result).toHaveProperty("upcomingSessions");
    expect(result).toHaveProperty("sponsors");
    expect(result).toHaveProperty("polls");
    expect(result).toHaveProperty("event");
  });
});
