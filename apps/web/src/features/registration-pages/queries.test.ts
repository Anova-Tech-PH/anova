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

import { getRegistrationPages, getRegistrationPageBySlug } from "./queries";

describe("getRegistrationPages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns pages ordered by created_at", async () => {
    const mockPages = [
      {
        id: "page-1",
        event_id: "event-1",
        name: "General Registration",
        slug: "general-registration",
        ticket_type_ids: [],
        is_default: true,
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "page-2",
        event_id: "event-1",
        name: "VIP Registration",
        slug: "vip-registration",
        ticket_type_ids: ["ticket-1"],
        is_default: false,
        created_at: "2026-01-02T00:00:00Z",
      },
    ];

    mockCreateClient.mockResolvedValue({
      from: () => createQueryMock({ data: mockPages, error: null }),
    });

    const result = await getRegistrationPages("event-1");
    expect(result).toEqual(mockPages);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("General Registration");
  });

  it("throws on supabase error", async () => {
    mockCreateClient.mockResolvedValue({
      from: () =>
        createQueryMock({ data: null, error: { message: "DB error" } }),
    });

    await expect(getRegistrationPages("event-1")).rejects.toThrow("DB error");
  });
});

describe("getRegistrationPageBySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns page when found", async () => {
    const mockPage = {
      id: "page-1",
      event_id: "event-1",
      name: "General Registration",
      slug: "general-registration",
      ticket_type_ids: [],
      is_default: true,
      created_at: "2026-01-01T00:00:00Z",
    };

    mockCreateClient.mockResolvedValue({
      from: () => createQueryMock({ data: mockPage, error: null }),
    });

    const result = await getRegistrationPageBySlug("event-1", "general-registration");
    expect(result).toEqual(mockPage);
    expect(result?.name).toBe("General Registration");
  });

  it("returns null when not found", async () => {
    mockCreateClient.mockResolvedValue({
      from: () =>
        createQueryMock({ data: null, error: { message: "Not found", code: "PGRST116" } }),
    });

    const result = await getRegistrationPageBySlug("event-1", "nonexistent");
    expect(result).toBeNull();
  });
});
