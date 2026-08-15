import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Supabase mock plumbing ───────────────────────────────────────────
const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Import after mock
import {
  createContest,
  updateContest,
  deleteContest,
  submitContestEntry,
  toggleContestLike,
} from "./contest-actions";

// ── Helpers ──────────────────────────────────────────────────────────
const EVENT_ID = "evt-001";
const CONTEST_ID = "contest-001";
const USER_ID = "user-001";
const ENTRY_ID = "entry-001";

describe("contest actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── createContest ──────────────────────────────────────────────────
  it("createContest inserts and returns the contest", async () => {
    const contestData = {
      type: "photo" as const,
      title: "Best Photo",
      description: "Share your best event photo",
      starts_at: "2026-08-15T10:00:00Z",
      ends_at: "2026-08-15T18:00:00Z",
      points_per_action: 10,
    };
    const returnedContest = { id: CONTEST_ID, event_id: EVENT_ID, ...contestData };

    mockFrom.mockImplementation(() => {
      const chain: Record<string, any> = {};
      chain.insert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: returnedContest, error: null }),
        }),
      });
      return chain;
    });

    const result = await createContest(EVENT_ID, contestData);

    expect(mockFrom).toHaveBeenCalledWith("contests");
    expect(result).toEqual(returnedContest);
  });

  it("createContest throws on error", async () => {
    mockFrom.mockImplementation(() => {
      const chain: Record<string, any> = {};
      chain.insert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: "insert failed" } }),
        }),
      });
      return chain;
    });

    await expect(createContest(EVENT_ID, { type: "photo", title: "X" } as any)).rejects.toThrow(
      "insert failed"
    );
  });

  // ── updateContest ──────────────────────────────────────────────────
  it("updateContest updates the contest", async () => {
    mockFrom.mockImplementation(() => {
      const chain: Record<string, any> = {};
      const eqFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      chain.update = vi.fn().mockReturnValue({ eq: eqFn });
      return chain;
    });

    await updateContest(EVENT_ID, CONTEST_ID, { title: "Updated Title" });

    expect(mockFrom).toHaveBeenCalledWith("contests");
  });

  // ── deleteContest ──────────────────────────────────────────────────
  it("deleteContest deletes the contest", async () => {
    mockFrom.mockImplementation(() => {
      const chain: Record<string, any> = {};
      const eqFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      chain.delete = vi.fn().mockReturnValue({ eq: eqFn });
      return chain;
    });

    await deleteContest(EVENT_ID, CONTEST_ID);

    expect(mockFrom).toHaveBeenCalledWith("contests");
  });

  // ── submitContestEntry ─────────────────────────────────────────────
  it("submitContestEntry inserts entry and calls award_points RPC", async () => {
    const contest = {
      id: CONTEST_ID,
      event_id: EVENT_ID,
      type: "photo",
      status: "active",
      points_per_action: 10,
    };
    const entryData = { content: "My photo", image_url: "https://example.com/photo.jpg" };
    const returnedEntry = { id: ENTRY_ID, contest_id: CONTEST_ID, user_id: USER_ID, ...entryData };

    let callIndex = 0;
    mockFrom.mockImplementation((table: string) => {
      const chain: Record<string, any> = {};
      if (table === "contests") {
        // First call: lookup contest
        chain.select = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: contest, error: null }),
          }),
        });
      } else if (table === "contest_entries") {
        // Second call: insert entry
        chain.insert = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: returnedEntry, error: null }),
          }),
        });
      }
      return chain;
    });

    mockRpc.mockResolvedValue({ error: null });

    const result = await submitContestEntry(CONTEST_ID, USER_ID, entryData);

    expect(result).toEqual(returnedEntry);
    expect(mockFrom).toHaveBeenCalledWith("contests");
    expect(mockFrom).toHaveBeenCalledWith("contest_entries");
    expect(mockRpc).toHaveBeenCalledWith("award_points", {
      _event_id: EVENT_ID,
      _user_id: USER_ID,
      _activity_type: "photo_upload",
      _points: 10,
      _reference_id: ENTRY_ID,
      _reference_type: "contest_entry",
    });
  });

  it("submitContestEntry throws if contest is not active", async () => {
    const contest = {
      id: CONTEST_ID,
      event_id: EVENT_ID,
      type: "photo",
      status: "draft",
      points_per_action: 10,
    };

    mockFrom.mockImplementation(() => {
      const chain: Record<string, any> = {};
      chain.select = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: contest, error: null }),
        }),
      });
      return chain;
    });

    await expect(
      submitContestEntry(CONTEST_ID, USER_ID, { content: "test" })
    ).rejects.toThrow("Contest is not active");
  });

  // ── toggleContestLike ──────────────────────────────────────────────
  it("toggleContestLike inserts like when not already liked", async () => {
    mockFrom.mockImplementation((table: string) => {
      const chain: Record<string, any> = {};
      if (table === "contest_likes") {
        chain.select = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
            }),
          }),
        });
        chain.insert = vi.fn().mockResolvedValue({ error: null });
      } else if (table === "contest_entries") {
        // Update likes_count
        const eqFn = vi.fn().mockResolvedValue({ error: null });
        chain.update = vi.fn().mockReturnValue({ eq: eqFn });
      }
      return chain;
    });

    const result = await toggleContestLike(ENTRY_ID, USER_ID);

    expect(result).toEqual({ liked: true });
  });

  it("toggleContestLike removes like when already liked", async () => {
    mockFrom.mockImplementation((table: string) => {
      const chain: Record<string, any> = {};
      if (table === "contest_likes") {
        chain.select = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: "like-1" }, error: null }),
            }),
          }),
        });
        chain.delete = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        });
      } else if (table === "contest_entries") {
        const eqFn = vi.fn().mockResolvedValue({ error: null });
        chain.update = vi.fn().mockReturnValue({ eq: eqFn });
      }
      return chain;
    });

    const result = await toggleContestLike(ENTRY_ID, USER_ID);

    expect(result).toEqual({ liked: false });
  });
});
