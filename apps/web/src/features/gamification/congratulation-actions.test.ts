import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();
vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: mockFrom,
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "current-user" } },
        }),
      },
    })
  ),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("getCongratulationCounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns a Map of to_user_id to count", async () => {
    const { getCongratulationCounts } = await import("./congratulation-queries");

    const mockEq = vi.fn().mockResolvedValue({
      data: [
        { to_user_id: "user-1", count: 3 },
        { to_user_id: "user-2", count: 1 },
      ],
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await getCongratulationCounts("event-1");
    expect(result).toBeInstanceOf(Map);
    expect(result.get("user-1")).toBe(3);
    expect(result.get("user-2")).toBe(1);
  });

  it("returns empty Map on error", async () => {
    const { getCongratulationCounts } = await import("./congratulation-queries");

    const mockEq = vi.fn().mockResolvedValue({ data: null, error: { message: "err" } });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await getCongratulationCounts("event-1");
    expect(result.size).toBe(0);
  });
});

describe("getUserCongratulations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns a Set of to_user_ids", async () => {
    const { getUserCongratulations } = await import("./congratulation-queries");

    const mockEq2 = vi.fn().mockResolvedValue({
      data: [{ to_user_id: "user-a" }, { to_user_id: "user-b" }],
      error: null,
    });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await getUserCongratulations("event-1", "me");
    expect(result).toBeInstanceOf(Set);
    expect(result.has("user-a")).toBe(true);
    expect(result.has("user-b")).toBe(true);
  });
});
