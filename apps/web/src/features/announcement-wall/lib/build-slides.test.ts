import { describe, it, expect } from "vitest";
import { buildSlides, type BuildSlidesInput } from "./build-slides";

function makeInput(overrides: Partial<BuildSlidesInput> = {}): BuildSlidesInput {
  return {
    config: {
      show_event_overview: false,
      show_announcements: false,
      show_upcoming_sessions: false,
      show_sponsors: false,
      show_polls: false,
      show_custom_slides: false,
    },
    event: {
      title: "Test Conference",
      slug: "test-conf",
      start_date: "2026-09-01",
      end_date: "2026-09-03",
      banner_url: null,
      location_name: "Convention Center",
      organization: { slug: "acme" },
    },
    announcements: [],
    upcomingSessions: [],
    sponsors: [],
    activePolls: [],
    customSlides: [],
    baseUrl: "https://app.attendly.com",
    ...overrides,
  };
}

describe("buildSlides", () => {
  it("returns event overview slide when enabled", () => {
    const input = makeInput({
      config: {
        show_event_overview: true,
        show_announcements: false,
        show_upcoming_sessions: false,
        show_sponsors: false,
        show_polls: false,
        show_custom_slides: false,
      },
    });

    const slides = buildSlides(input);

    expect(slides).toHaveLength(1);
    expect(slides[0]).toMatchObject({
      type: "event_overview",
      title: "Test Conference",
      meta: "Convention Center",
      qrUrl: "https://app.attendly.com/acme/test-conf",
    });
    expect(slides[0].body).toContain("Sep");
  });

  it("converts announcements to slides", () => {
    const input = makeInput({
      config: {
        show_event_overview: false,
        show_announcements: true,
        show_upcoming_sessions: false,
        show_sponsors: false,
        show_polls: false,
        show_custom_slides: false,
      },
      announcements: [
        {
          id: "a1",
          subject: "Welcome!",
          body: "<p>Hello&nbsp;everyone!</p>",
          sent_at: "2026-09-01T10:00:00Z",
        },
        {
          id: "a2",
          subject: "Lunch Update",
          body: "<strong>Lunch</strong> is at <em>noon</em>.",
          sent_at: "2026-09-01T11:00:00Z",
        },
      ],
    });

    const slides = buildSlides(input);

    expect(slides).toHaveLength(2);
    expect(slides[0]).toMatchObject({
      type: "announcement",
      title: "Welcome!",
      body: "Hello everyone!",
    });
    expect(slides[1]).toMatchObject({
      type: "announcement",
      title: "Lunch Update",
      body: "Lunch is at noon.",
    });
  });

  it("converts sessions to slides with speakers", () => {
    const input = makeInput({
      config: {
        show_event_overview: false,
        show_announcements: false,
        show_upcoming_sessions: true,
        show_sponsors: false,
        show_polls: false,
        show_custom_slides: false,
      },
      upcomingSessions: [
        {
          id: "s1",
          title: "Keynote",
          start_time: "2026-09-01T09:00:00Z",
          end_time: "2026-09-01T10:00:00Z",
          location: "Main Hall",
          session_speakers: [
            { speakers: { name: "Alice Smith" } },
            { speakers: { name: "Bob Jones" } },
          ],
        },
      ],
    });

    const slides = buildSlides(input);

    expect(slides).toHaveLength(1);
    expect(slides[0]).toMatchObject({
      type: "session",
      title: "Keynote",
      meta: "Main Hall",
      speakers: ["Alice Smith", "Bob Jones"],
    });
    expect(slides[0].body).toBeDefined();
  });

  it("skips disabled slide types", () => {
    const input = makeInput({
      announcements: [
        { id: "a1", subject: "Ignored", body: "nope", sent_at: "2026-09-01T10:00:00Z" },
      ],
      upcomingSessions: [
        {
          id: "s1",
          title: "Ignored Session",
          start_time: "2026-09-01T09:00:00Z",
          end_time: "2026-09-01T10:00:00Z",
          location: null,
        },
      ],
      sponsors: [{ id: "sp1", name: "BigCorp", logo: null }],
      activePolls: [{ id: "p1", question: "Best talk?", status: "active" }],
      customSlides: [
        { id: "c1", title: "Custom", body: "hi", bg_color: "#ff0000", display_order: 1, enabled: true },
      ],
    });

    const slides = buildSlides(input);

    expect(slides).toHaveLength(0);
  });

  it("adds custom slides with bg_color", () => {
    const input = makeInput({
      config: {
        show_event_overview: false,
        show_announcements: false,
        show_upcoming_sessions: false,
        show_sponsors: false,
        show_polls: false,
        show_custom_slides: true,
      },
      customSlides: [
        { id: "c1", title: "Welcome Slide", body: "Enjoy the event!", bg_color: "#3b82f6", display_order: 1, enabled: true },
        { id: "c2", title: "Disabled Slide", body: "Hidden", bg_color: "#000", display_order: 2, enabled: false },
        { id: "c3", title: "Closing", body: null, bg_color: "#10b981", display_order: 3, enabled: true },
      ],
    });

    const slides = buildSlides(input);

    expect(slides).toHaveLength(2);
    expect(slides[0]).toMatchObject({
      type: "custom",
      title: "Welcome Slide",
      body: "Enjoy the event!",
      bgColor: "#3b82f6",
    });
    expect(slides[1]).toMatchObject({
      type: "custom",
      title: "Closing",
      bgColor: "#10b981",
    });
    expect(slides[1].body).toBeUndefined();
  });
});
