import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getPublishReadiness } from "./queries";

function createQueryMock(result: { data?: unknown; error?: unknown; count?: number }) {
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

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

function setupMocks(overrides: {
  event?: Record<string, unknown>;
  sessionCount?: number;
  speakerCount?: number;
  ticketCount?: number;
  surveyCount?: number;
}) {
  const event = {
    title: "Test Event",
    start_date: "2027-01-15T09:00:00Z",
    end_date: "2027-01-16T17:00:00Z",
    venue_name: "Test Venue",
    is_virtual: false,
    virtual_url: null,
    website_config: null,
    ...overrides.event,
  };

  let callIndex = 0;
  mockFrom.mockImplementation(() => {
    const idx = callIndex++;
    if (idx === 0) {
      // events query
      return createQueryMock({ data: event, error: null });
    }
    if (idx === 1) {
      // sessions count
      return createQueryMock({
        data: null,
        error: null,
        count: overrides.sessionCount ?? 1,
      });
    }
    // sessions for speaker lookup
    if (idx === 2) {
      return createQueryMock({ data: [{ id: "s1" }], error: null });
    }
    if (idx === 3) {
      // speakers count
      return createQueryMock({
        data: null,
        error: null,
        count: overrides.speakerCount ?? 0,
      });
    }
    if (idx === 4) {
      // tickets count
      return createQueryMock({
        data: null,
        error: null,
        count: overrides.ticketCount ?? 0,
      });
    }
    if (idx === 5) {
      // surveys count
      return createQueryMock({
        data: null,
        error: null,
        count: overrides.surveyCount ?? 0,
      });
    }
    return createQueryMock({ data: null, error: null, count: 0 });
  });
}

describe("getPublishReadiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows specific missing fields when basics incomplete", async () => {
    setupMocks({
      event: { venue_name: null, is_virtual: false, virtual_url: null },
    });

    const result = await getPublishReadiness("event-1");
    const basicsCheck = result.checks.find((c) => c.id === "basics");

    expect(basicsCheck?.description).toBe("Missing: venue or virtual URL.");
    expect(basicsCheck?.status).toBe("fail");
  });

  it("shows multiple missing fields", async () => {
    setupMocks({
      event: {
        title: "",
        start_date: null,
        end_date: null,
        venue_name: null,
      },
    });

    const result = await getPublishReadiness("event-1");
    const basicsCheck = result.checks.find((c) => c.id === "basics");

    expect(basicsCheck?.description).toBe(
      "Missing: title, start date, end date, venue or virtual URL."
    );
  });

  it("adds a past-event warning when event has already started", async () => {
    setupMocks({
      event: {
        start_date: "2026-08-10T09:00:00Z",
        end_date: "2026-08-11T17:00:00Z",
      },
    });

    const result = await getPublishReadiness("event-1");
    const pastCheck = result.checks.find((c) => c.id === "not-started");

    expect(pastCheck).toBeDefined();
    expect(pastCheck?.status).toBe("fail");
    expect(pastCheck?.required).toBe(true);
    expect(result.canPublish).toBe(false);
  });

  it("passes past-event check when event is in the future", async () => {
    setupMocks({
      event: {
        start_date: "2027-01-15T09:00:00Z",
        end_date: "2027-01-16T17:00:00Z",
      },
    });

    const result = await getPublishReadiness("event-1");
    const pastCheck = result.checks.find((c) => c.id === "not-started");

    expect(pastCheck).toBeDefined();
    expect(pastCheck?.status).toBe("pass");
  });

  it("can publish when all required checks pass", async () => {
    setupMocks({ sessionCount: 3 });

    const result = await getPublishReadiness("event-1");

    expect(result.canPublish).toBe(true);
    expect(result.requiredPassed).toBe(result.requiredTotal);
  });
});
