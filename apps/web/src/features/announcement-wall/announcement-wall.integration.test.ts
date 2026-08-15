import { describe, it, expect, vi } from "vitest";

// Mock dependencies used by queries and actions modules
vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Announcement Wall – integration", () => {
  it("queries module exports all functions", async () => {
    const queries = await import("./queries");

    expect(queries.getWallConfig).toBeDefined();
    expect(queries.getCustomSlides).toBeDefined();
    expect(queries.getAllCustomSlides).toBeDefined();
    expect(queries.getWallData).toBeDefined();
    expect(queries.getDefaultConfig).toBeDefined();
  });

  it("actions module exports all functions", async () => {
    const actions = await import("./actions");

    expect(actions.upsertWallConfig).toBeDefined();
    expect(actions.createCustomSlide).toBeDefined();
    expect(actions.updateCustomSlide).toBeDefined();
    expect(actions.deleteCustomSlide).toBeDefined();
  });

  it("buildSlides returns empty array when all types disabled", async () => {
    const { buildSlides } = await import("./lib/build-slides");

    const result = buildSlides({
      config: {
        show_event_overview: false,
        show_announcements: false,
        show_upcoming_sessions: false,
        show_sponsors: false,
        show_polls: false,
        show_custom_slides: false,
      },
      event: {
        title: "Test Event",
        slug: "test-event",
        start_date: "2026-09-01",
        end_date: "2026-09-02",
        banner_url: null,
        location_name: "Hall A",
        organization: { slug: "org1" },
      },
      announcements: [
        { id: "a1", subject: "Hello", body: "<p>World</p>", sent_at: "2026-09-01T10:00:00Z" },
      ],
      upcomingSessions: [
        {
          id: "s1",
          title: "Session 1",
          start_time: "2026-09-01T11:00:00Z",
          end_time: "2026-09-01T12:00:00Z",
          location: "Room 1",
        },
      ],
      sponsors: [{ id: "sp1", name: "Sponsor A", logo: null }],
      activePolls: [{ id: "p1", question: "Favorite color?", status: "open" }],
      customSlides: [
        {
          id: "cs1",
          title: "Welcome",
          body: "Enjoy the event",
          bg_color: "#ff0000",
          display_order: 0,
          enabled: true,
        },
      ],
      baseUrl: "https://example.com",
    });

    expect(result).toEqual([]);
  });

  it("buildSlides interleaves all slide types correctly", async () => {
    const { buildSlides } = await import("./lib/build-slides");

    const result = buildSlides({
      config: {
        show_event_overview: true,
        show_announcements: true,
        show_upcoming_sessions: true,
        show_sponsors: true,
        show_polls: true,
        show_custom_slides: true,
      },
      event: {
        title: "Test Event",
        slug: "test-event",
        start_date: "2026-09-01",
        end_date: "2026-09-02",
        banner_url: null,
        location_name: "Hall A",
        organization: { slug: "org1" },
      },
      announcements: [
        { id: "a1", subject: "Hello", body: "<p>World</p>", sent_at: "2026-09-01T10:00:00Z" },
      ],
      upcomingSessions: [
        {
          id: "s1",
          title: "Session 1",
          start_time: "2026-09-01T11:00:00Z",
          end_time: "2026-09-01T12:00:00Z",
          location: "Room 1",
        },
      ],
      sponsors: [{ id: "sp1", name: "Sponsor A", logo: null }],
      activePolls: [{ id: "p1", question: "Favorite color?", status: "open" }],
      customSlides: [
        {
          id: "cs1",
          title: "Welcome",
          body: "Enjoy the event",
          bg_color: "#ff0000",
          display_order: 0,
          enabled: true,
        },
      ],
      baseUrl: "https://example.com",
    });

    expect(result).toHaveLength(6);

    const types = result.map((s) => s.type);
    expect(types).toContain("event_overview");
    expect(types).toContain("announcement");
    expect(types).toContain("session");
    expect(types).toContain("sponsor");
    expect(types).toContain("poll");
    expect(types).toContain("custom");
  });
});
