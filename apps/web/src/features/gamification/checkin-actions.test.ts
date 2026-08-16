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

describe("generateCheckinToken", () => {
  it("produces deterministic tokens for the same inputs", async () => {
    const { generateCheckinToken } = await import("./checkin-tokens");
    const token1 = generateCheckinToken("session", "s1", "e1");
    const token2 = generateCheckinToken("session", "s1", "e1");
    expect(token1).toBe(token2);
  });

  it("produces different tokens for different inputs", async () => {
    const { generateCheckinToken } = await import("./checkin-tokens");
    const tokenA = generateCheckinToken("session", "s1", "e1");
    const tokenB = generateCheckinToken("session", "s2", "e1");
    const tokenC = generateCheckinToken("exhibitor", "s1", "e1");
    expect(tokenA).not.toBe(tokenB);
    expect(tokenA).not.toBe(tokenC);
  });
});

describe("validateCheckinToken", () => {
  it("returns true for a valid token", async () => {
    const { generateCheckinToken, validateCheckinToken } = await import("./checkin-tokens");
    const token = generateCheckinToken("session", "s1", "e1");
    expect(validateCheckinToken("session", "s1", "e1", token)).toBe(true);
  });

  it("returns false for an invalid token", async () => {
    const { validateCheckinToken } = await import("./checkin-tokens");
    expect(validateCheckinToken("session", "s1", "e1", "bad-token")).toBe(false);
  });
});

describe("performCheckin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts session checkin and awards points for type=session", async () => {
    mockFrom.mockReturnValue(createQueryMock({ data: { id: "checkin-1" }, error: null }));
    mockRpc.mockResolvedValue({ data: 15, error: null });

    const { performCheckin } = await import("./checkin-actions");
    const result = await performCheckin({
      type: "session",
      id: "session-1",
      eventId: "event-1",
      userId: "user-1",
    });

    expect(mockFrom).toHaveBeenCalledWith("session_checkins");
    expect(mockRpc).toHaveBeenCalledWith("award_points", expect.objectContaining({
      _activity_type: "session_checkin",
    }));
    expect(result).toEqual({ success: true, points: 15, alreadyCheckedIn: false });
  });

  it("inserts exhibitor stamp and awards points for type=exhibitor", async () => {
    mockFrom.mockReturnValue(createQueryMock({ data: { id: "stamp-1" }, error: null }));
    mockRpc.mockResolvedValue({ data: 10, error: null });

    const { performCheckin } = await import("./checkin-actions");
    const result = await performCheckin({
      type: "exhibitor",
      id: "exhibitor-1",
      eventId: "event-1",
      userId: "user-1",
    });

    expect(mockFrom).toHaveBeenCalledWith("exhibitor_passport_stamps");
    expect(mockRpc).toHaveBeenCalledWith("award_points", expect.objectContaining({
      _activity_type: "exhibitor_visit",
    }));
    expect(result).toEqual({ success: true, points: 10, alreadyCheckedIn: false });
  });

  it("handles duplicate key error (23505) as alreadyCheckedIn", async () => {
    mockFrom.mockReturnValue(
      createQueryMock({ data: null, error: { code: "23505", message: "duplicate" } })
    );

    const { performCheckin } = await import("./checkin-actions");
    const result = await performCheckin({
      type: "session",
      id: "session-1",
      eventId: "event-1",
      userId: "user-1",
    });

    expect(result).toEqual({ success: true, points: 0, alreadyCheckedIn: true });
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe("getPassportStamps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns exhibitor_ids for a user's stamps", async () => {
    mockFrom.mockReturnValue(
      createQueryMock({
        data: [{ exhibitor_id: "ex-1" }, { exhibitor_id: "ex-2" }],
        error: null,
      })
    );

    const { getPassportStamps } = await import("./checkin-actions");
    const stamps = await getPassportStamps("event-1", "user-1");
    expect(stamps).toEqual(["ex-1", "ex-2"]);
  });
});

describe("getSessionCheckins", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns checkin records", async () => {
    const checkins = [{ id: "c1", user_id: "u1", session_id: "s1" }];
    mockFrom.mockReturnValue(createQueryMock({ data: checkins, error: null }));

    const { getSessionCheckins } = await import("./checkin-actions");
    const result = await getSessionCheckins("event-1", "s1");
    expect(result).toEqual(checkins);
  });
});
