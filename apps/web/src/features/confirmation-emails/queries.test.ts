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

import { getTemplatesByEvent, getTemplateForTicket } from "./queries";

describe("getTemplatesByEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns templates with ticket_type_name mapped from join", async () => {
    const rawData = [
      {
        id: "tpl-1",
        event_id: "event-1",
        ticket_type_id: null,
        subject: "Welcome!",
        body: "Thanks for registering",
        enabled: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        ticket_types: null,
      },
      {
        id: "tpl-2",
        event_id: "event-1",
        ticket_type_id: "tt-1",
        subject: "VIP Welcome",
        body: "Welcome VIP",
        enabled: true,
        created_at: "2026-01-02T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
        ticket_types: { name: "VIP Pass" },
      },
    ];

    mockCreateClient.mockResolvedValue({
      from: () => createQueryMock({ data: rawData, error: null }),
    });

    const result = await getTemplatesByEvent("event-1");
    expect(result).toHaveLength(2);
    expect(result[0].ticket_type_name).toBe("All Tickets (Default)");
    expect(result[1].ticket_type_name).toBe("VIP Pass");
    // ticket_types join field should be removed
    expect((result[0] as any).ticket_types).toBeUndefined();
    expect((result[1] as any).ticket_types).toBeUndefined();
  });

  it("throws on supabase error", async () => {
    mockCreateClient.mockResolvedValue({
      from: () =>
        createQueryMock({ data: null, error: { message: "DB error" } }),
    });

    await expect(getTemplatesByEvent("event-1")).rejects.toThrow("DB error");
  });
});

describe("getTemplateForTicket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ticket-specific template when available", async () => {
    const specificTemplate = {
      id: "tpl-2",
      event_id: "event-1",
      ticket_type_id: "tt-1",
      subject: "VIP Welcome",
      body: "VIP body",
      enabled: true,
    };

    let callCount = 0;
    mockCreateClient.mockResolvedValue({
      from: () => {
        callCount++;
        // First call is for specific template
        return createQueryMock({ data: specificTemplate, error: null });
      },
    });

    const result = await getTemplateForTicket("event-1", "tt-1");
    expect(result).toEqual(specificTemplate);
  });

  it("falls back to default template when no specific match", async () => {
    const defaultTemplate = {
      id: "tpl-1",
      event_id: "event-1",
      ticket_type_id: null,
      subject: "Welcome!",
      body: "Default body",
      enabled: true,
    };

    let callCount = 0;
    mockCreateClient.mockResolvedValue({
      from: () => {
        callCount++;
        if (callCount === 1) {
          // First call: specific template not found
          return createQueryMock({ data: null, error: null });
        }
        // Second call: fallback to default
        return createQueryMock({ data: defaultTemplate, error: null });
      },
    });

    const result = await getTemplateForTicket("event-1", "tt-1");
    expect(result).toEqual(defaultTemplate);
  });

  it("returns null when no templates exist", async () => {
    mockCreateClient.mockResolvedValue({
      from: () => createQueryMock({ data: null, error: null }),
    });

    const result = await getTemplateForTicket("event-1", "tt-1");
    expect(result).toBeNull();
  });
});
