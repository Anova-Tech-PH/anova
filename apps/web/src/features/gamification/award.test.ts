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

const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ rpc: mockRpc, from: mockFrom })),
}));

describe("tryAwardPoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls award_points RPC and returns points awarded", async () => {
    mockRpc.mockResolvedValue({ data: 10, error: null });

    // Badge check queries: badge_definitions returns empty, user_badges returns empty
    mockFrom.mockReturnValue(createQueryMock({ data: [], error: null }));

    const { tryAwardPoints } = await import("./award");
    const result = await tryAwardPoints("event-1", "user-1", "poll_vote", "poll-1", "poll");

    expect(mockRpc).toHaveBeenCalledWith("award_points", {
      _event_id: "event-1",
      _user_id: "user-1",
      _activity_type: "poll_vote",
      _reference_id: "poll-1",
      _reference_type: "poll",
    });
    expect(result.points).toBe(10);
  });

  it("returns 0 points and empty badges on RPC error (silent failure)", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "error" } });

    const { tryAwardPoints } = await import("./award");
    const result = await tryAwardPoints("event-1", "user-1", "poll_vote", "poll-1", "poll");

    expect(result).toEqual({ points: 0, newBadges: [] });
  });

  it("returns 0 points when RPC returns 0 (gamification disabled)", async () => {
    mockRpc.mockResolvedValue({ data: 0, error: null });

    const { tryAwardPoints } = await import("./award");
    const result = await tryAwardPoints("event-1", "user-1", "poll_vote", "poll-1", "poll");

    expect(result.points).toBe(0);
  });
});
