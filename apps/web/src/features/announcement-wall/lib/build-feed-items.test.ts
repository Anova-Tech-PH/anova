import { describe, test, expect } from "vitest";
import { buildFeedItems } from "./build-feed-items";

const baseInput = {
  config: {
    show_announcements: true,
    show_upcoming_sessions: true,
    show_sponsors: true,
    show_polls: true,
    show_custom_slides: true,
  },
  announcements: [],
  upcomingSessions: [],
  sponsors: [],
  activePolls: [],
  customSlides: [],
};

describe("buildFeedItems", () => {
  test("returns empty array when no data", () => {
    const items = buildFeedItems(baseInput);
    expect(items).toEqual([]);
  });

  test("includes announcements when toggle is on", () => {
    const items = buildFeedItems({
      ...baseInput,
      announcements: [
        { id: "a1", subject: "Welcome", body: "<p>Hello&nbsp;world</p>", sent_at: "2026-09-04T10:00:00Z" },
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe("announcement");
    expect(items[0].title).toBe("Welcome");
    expect(items[0].body).toBe("Hello world");
  });

  test("excludes announcements when toggle is off", () => {
    const items = buildFeedItems({
      ...baseInput,
      config: { ...baseInput.config, show_announcements: false },
      announcements: [
        { id: "a1", subject: "Welcome", body: "Hello", sent_at: "2026-09-04T10:00:00Z" },
      ],
    });
    expect(items).toHaveLength(0);
  });

  test("includes upcoming sessions with speakers", () => {
    const items = buildFeedItems({
      ...baseInput,
      upcomingSessions: [
        {
          id: "s1",
          title: "Keynote",
          start_time: "2026-09-04T10:00:00Z",
          end_time: "2026-09-04T11:00:00Z",
          location: "Main Hall",
          session_speakers: [{ speakers: { name: "Jane Doe" } }],
        },
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe("session");
    expect(items[0].speakers).toEqual(["Jane Doe"]);
    expect(items[0].meta).toBe("Main Hall");
  });

  test("includes sponsors, polls, and custom slides", () => {
    const items = buildFeedItems({
      ...baseInput,
      sponsors: [{ id: "sp1", name: "Acme", logo: null, tier: { name: "Gold", sort_order: 1 } }],
      activePolls: [{ id: "p1", question: "Best talk?", status: "open" }],
      customSlides: [{ id: "cs1", title: "WiFi", body: "Password: 1234", bg_color: "#1e293b", display_order: 0, enabled: true }],
    });
    expect(items).toHaveLength(3);
    const types = items.map((i) => i.type);
    expect(types).toContain("sponsor");
    expect(types).toContain("poll");
    expect(types).toContain("custom");
  });

  test("sorts by sortKey — sessions by start_time, announcements by sent_at desc", () => {
    const items = buildFeedItems({
      ...baseInput,
      announcements: [
        { id: "a1", subject: "Old", body: "", sent_at: "2026-09-04T08:00:00Z" },
        { id: "a2", subject: "New", body: "", sent_at: "2026-09-04T12:00:00Z" },
      ],
      upcomingSessions: [
        { id: "s1", title: "Later", start_time: "2026-09-04T14:00:00Z", end_time: "2026-09-04T15:00:00Z", location: null },
        { id: "s2", title: "Sooner", start_time: "2026-09-04T10:00:00Z", end_time: "2026-09-04T11:00:00Z", location: null },
      ],
    });
    // Sessions come first (soonest first), then announcements (newest first)
    expect(items[0].title).toBe("Sooner");
    expect(items[1].title).toBe("Later");
    expect(items[2].title).toBe("New");
    expect(items[3].title).toBe("Old");
  });
});
