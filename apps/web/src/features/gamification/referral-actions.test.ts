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

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe("getOrCreateReferralCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing code if one is found", async () => {
    const existing = { code: "ABCD1234", registrations_count: 3 };
    // First call: select from referral_codes -> found
    mockFrom.mockReturnValueOnce(createQueryMock({ data: existing, error: null }));

    const { getOrCreateReferralCode } = await import("./referral-actions");
    const result = await getOrCreateReferralCode("event-1", "user-1");

    expect(result).toEqual({ code: "ABCD1234", registrations_count: 3 });
  });

  it("creates a new code if none exists", async () => {
    // First call: select -> not found (data is null)
    mockFrom.mockReturnValueOnce(createQueryMock({ data: null, error: { code: "PGRST116" } }));
    // Second call: insert -> returns new row
    const newRow = { code: "DEADBEEF", registrations_count: 0 };
    mockFrom.mockReturnValueOnce(createQueryMock({ data: newRow, error: null }));

    const { getOrCreateReferralCode } = await import("./referral-actions");
    const result = await getOrCreateReferralCode("event-1", "user-1");

    expect(result).toEqual({ code: "DEADBEEF", registrations_count: 0 });
  });
});

describe("processReferral", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("awards points to referrer on valid referral", async () => {
    const codeRow = { id: "ref-1", event_id: "event-1", user_id: "referrer-1", code: "ABCD1234" };

    // 1st from call: select referral_codes -> found
    mockFrom.mockReturnValueOnce(createQueryMock({ data: codeRow, error: null }));
    // 2nd from call: insert referral_registrations -> success
    mockFrom.mockReturnValueOnce(createQueryMock({ data: { id: "rr-1" }, error: null }));
    // 3rd from call: update referral_codes counter
    mockFrom.mockReturnValueOnce(createQueryMock({ data: null, error: null }));
    // award_points RPC
    mockRpc.mockResolvedValue({ data: 25, error: null });

    const { processReferral } = await import("./referral-actions");
    const result = await processReferral("ABCD1234", "new-user-1");

    expect(result).toEqual({ success: true, points: 25 });
    expect(mockRpc).toHaveBeenCalledWith("award_points", expect.objectContaining({
      _user_id: "referrer-1",
      _activity_type: "referral_registration",
    }));
  });

  it("silently ignores invalid referral codes", async () => {
    // select referral_codes -> not found
    mockFrom.mockReturnValueOnce(createQueryMock({ data: null, error: { code: "PGRST116" } }));

    const { processReferral } = await import("./referral-actions");
    const result = await processReferral("INVALID", "new-user-1");

    expect(result).toEqual({ success: false, points: 0 });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("silently ignores self-referrals", async () => {
    const codeRow = { id: "ref-1", event_id: "event-1", user_id: "user-1", code: "ABCD1234" };
    mockFrom.mockReturnValueOnce(createQueryMock({ data: codeRow, error: null }));

    const { processReferral } = await import("./referral-actions");
    const result = await processReferral("ABCD1234", "user-1");

    expect(result).toEqual({ success: false, points: 0 });
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe("getReferralStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns referral codes ordered by count", async () => {
    const stats = [
      { code: "AAA", registrations_count: 10, profiles: { full_name: "Alice" } },
      { code: "BBB", registrations_count: 5, profiles: { full_name: "Bob" } },
    ];
    mockFrom.mockReturnValue(createQueryMock({ data: stats, error: null }));

    const { getReferralStats } = await import("./referral-actions");
    const result = await getReferralStats("event-1");

    expect(result).toEqual(stats);
  });
});
