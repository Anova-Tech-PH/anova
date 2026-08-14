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

import { getAddonsByEvent } from "./queries";

describe("getAddonsByEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns addons ordered by sort_order", async () => {
    const mockAddons = [
      {
        id: "addon-1",
        event_id: "event-1",
        name: "T-Shirt",
        description: null,
        price: 25,
        quantity: 100,
        applies_to_tickets: null,
        sort_order: 0,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "addon-2",
        event_id: "event-1",
        name: "Lunch",
        description: "Catered lunch",
        price: 15,
        quantity: null,
        applies_to_tickets: null,
        sort_order: 1,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ];

    mockCreateClient.mockResolvedValue({
      from: () => createQueryMock({ data: mockAddons, error: null }),
    });

    const result = await getAddonsByEvent("event-1");
    expect(result).toEqual(mockAddons);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("T-Shirt");
  });

  it("throws on supabase error", async () => {
    mockCreateClient.mockResolvedValue({
      from: () =>
        createQueryMock({ data: null, error: { message: "DB error" } }),
    });

    await expect(getAddonsByEvent("event-1")).rejects.toThrow("DB error");
  });
});
