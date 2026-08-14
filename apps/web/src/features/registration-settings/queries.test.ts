import { describe, it, expect, vi, beforeEach } from "vitest";

// Proxy-based Supabase mock
function createQueryMock(result: { data?: unknown; error?: unknown }) {
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === "then")
        return (resolve: (v: unknown) => void) => resolve(result);
      return vi.fn(() => new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

const mockCreateClient = vi.fn();

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: () => mockCreateClient(),
}));

import { getRegistrationSettings, getWaitlistEntries } from "./queries";

describe("getRegistrationSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns settings from events.registration_settings", async () => {
    const mockSettings = {
      registration_open: "2026-01-01T09:00",
      registration_close: "2026-06-01T17:00",
      capacity_limit: 500,
      waitlist_enabled: true,
    };

    mockCreateClient.mockResolvedValue({
      from: () =>
        createQueryMock({
          data: { registration_settings: mockSettings },
          error: null,
        }),
    });

    const result = await getRegistrationSettings("event-1");
    expect(result).toEqual(mockSettings);
  });

  it("returns empty object when registration_settings is null", async () => {
    mockCreateClient.mockResolvedValue({
      from: () =>
        createQueryMock({
          data: { registration_settings: null },
          error: null,
        }),
    });

    const result = await getRegistrationSettings("event-1");
    expect(result).toEqual({});
  });

  it("throws on supabase error", async () => {
    mockCreateClient.mockResolvedValue({
      from: () =>
        createQueryMock({ data: null, error: { message: "DB error" } }),
    });

    await expect(getRegistrationSettings("event-1")).rejects.toThrow(
      "DB error"
    );
  });
});

describe("getWaitlistEntries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns waitlist entries ordered by created_at", async () => {
    const mockEntries = [
      {
        id: "entry-1",
        event_id: "event-1",
        ticket_type_id: null,
        email: "alice@example.com",
        name: "Alice",
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "entry-2",
        event_id: "event-1",
        ticket_type_id: "ticket-1",
        email: "bob@example.com",
        name: "Bob",
        created_at: "2026-01-02T00:00:00Z",
      },
    ];

    mockCreateClient.mockResolvedValue({
      from: () => createQueryMock({ data: mockEntries, error: null }),
    });

    const result = await getWaitlistEntries("event-1");
    expect(result).toEqual(mockEntries);
    expect(result).toHaveLength(2);
    expect(result[0].email).toBe("alice@example.com");
  });

  it("throws on supabase error", async () => {
    mockCreateClient.mockResolvedValue({
      from: () =>
        createQueryMock({ data: null, error: { message: "Query failed" } }),
    });

    await expect(getWaitlistEntries("event-1")).rejects.toThrow(
      "Query failed"
    );
  });
});
