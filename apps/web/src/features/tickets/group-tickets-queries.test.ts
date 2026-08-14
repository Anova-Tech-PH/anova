import { describe, it, expect, vi, beforeEach } from "vitest";

function createQueryMock(result: { data?: unknown; error?: unknown }) {
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === "then") return (resolve: (v: unknown) => void) => resolve(result);
      return vi.fn(() => new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

const mockFrom = vi.fn();
vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

describe("getGroupTickets", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns only tickets with group_size > 1", async () => {
    const tickets = [{ id: "t1", name: "Team of 5", group_size: 5 }];
    mockFrom.mockReturnValue(createQueryMock({ data: tickets, error: null }));
    const { getGroupTickets } = await import("./group-tickets-queries");
    const result = await getGroupTickets("e1");
    expect(result).toEqual(tickets);
    expect(mockFrom).toHaveBeenCalledWith("ticket_types");
  });

  it("throws on error", async () => {
    mockFrom.mockReturnValue(createQueryMock({ data: null, error: { message: "fail" } }));
    const { getGroupTickets } = await import("./group-tickets-queries");
    await expect(getGroupTickets("e1")).rejects.toThrow("fail");
  });
});
