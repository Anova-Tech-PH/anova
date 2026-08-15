import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Supabase mock plumbing ───────────────────────────────────────────
const mockFrom = vi.fn();

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Import after mock
import {
  getContests,
  getContest,
  getContestEntries,
  getUserLikes,
} from "./contest-queries";

// ── Helpers ──────────────────────────────────────────────────────────
const EVENT_ID = "evt-001";
const CONTEST_ID = "contest-001";
const USER_ID = "user-001";

describe("contest queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getContests ────────────────────────────────────────────────────
  it("getContests returns contests for an event", async () => {
    const contests = [
      { id: "c1", event_id: EVENT_ID, type: "photo", title: "Photo Contest", status: "active" },
      { id: "c2", event_id: EVENT_ID, type: "caption", title: "Caption Contest", status: "draft" },
    ];

    mockFrom.mockImplementation(() => {
      const chain: Record<string, any> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockResolvedValue({ data: contests, error: null });
      return chain;
    });

    const result = await getContests(EVENT_ID);

    expect(mockFrom).toHaveBeenCalledWith("contests");
    expect(result).toEqual(contests);
    expect(result).toHaveLength(2);
  });

  it("getContests returns contests filtered by status", async () => {
    const contests = [
      { id: "c1", event_id: EVENT_ID, type: "photo", title: "Photo Contest", status: "active" },
    ];

    mockFrom.mockImplementation(() => {
      const chain: Record<string, any> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockResolvedValue({ data: contests, error: null });
      return chain;
    });

    const result = await getContests(EVENT_ID, { status: "active" });

    expect(result).toEqual(contests);
  });

  it("getContests returns empty array on error", async () => {
    mockFrom.mockImplementation(() => {
      const chain: Record<string, any> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockResolvedValue({ data: null, error: { message: "error" } });
      return chain;
    });

    const result = await getContests(EVENT_ID);

    expect(result).toEqual([]);
  });

  // ── getContest ─────────────────────────────────────────────────────
  it("getContest returns a single contest", async () => {
    const contest = { id: CONTEST_ID, event_id: EVENT_ID, type: "photo", title: "Photo Contest" };

    mockFrom.mockImplementation(() => {
      const chain: Record<string, any> = {};
      chain.select = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: contest, error: null }),
        }),
      });
      return chain;
    });

    const result = await getContest(CONTEST_ID);

    expect(mockFrom).toHaveBeenCalledWith("contests");
    expect(result).toEqual(contest);
  });

  it("getContest returns null on error", async () => {
    mockFrom.mockImplementation(() => {
      const chain: Record<string, any> = {};
      chain.select = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
        }),
      });
      return chain;
    });

    const result = await getContest(CONTEST_ID);

    expect(result).toBeNull();
  });

  // ── getContestEntries ──────────────────────────────────────────────
  it("getContestEntries returns entries with profile info", async () => {
    const entries = [
      {
        id: "entry-1",
        contest_id: CONTEST_ID,
        user_id: "user-1",
        content: "My photo",
        image_url: "https://example.com/photo.jpg",
        likes_count: 5,
        created_at: "2026-08-15T12:00:00Z",
        profiles: { full_name: "Alice", avatar_url: "https://example.com/alice.jpg" },
      },
      {
        id: "entry-2",
        contest_id: CONTEST_ID,
        user_id: "user-2",
        content: "Another photo",
        image_url: null,
        likes_count: 3,
        created_at: "2026-08-15T13:00:00Z",
        profiles: { full_name: "Bob", avatar_url: null },
      },
    ];

    mockFrom.mockImplementation(() => {
      const chain: Record<string, any> = {};
      chain.select = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: entries, error: null }),
        }),
      });
      return chain;
    });

    const result = await getContestEntries(CONTEST_ID);

    expect(mockFrom).toHaveBeenCalledWith("contest_entries");
    expect(result).toEqual(entries);
    expect(result).toHaveLength(2);
  });

  it("getContestEntries returns empty array on error", async () => {
    mockFrom.mockImplementation(() => {
      const chain: Record<string, any> = {};
      chain.select = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: "error" } }),
        }),
      });
      return chain;
    });

    const result = await getContestEntries(CONTEST_ID);

    expect(result).toEqual([]);
  });

  // ── getUserLikes ───────────────────────────────────────────────────
  it("getUserLikes returns a Set of entry IDs", async () => {
    const likes = [
      { entry_id: "entry-1" },
      { entry_id: "entry-3" },
    ];

    mockFrom.mockImplementation(() => {
      const chain: Record<string, any> = {};
      chain.select = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: likes, error: null }),
        }),
      });
      return chain;
    });

    const result = await getUserLikes(CONTEST_ID, USER_ID);

    expect(result).toBeInstanceOf(Set);
    expect(result.has("entry-1")).toBe(true);
    expect(result.has("entry-3")).toBe(true);
    expect(result.has("entry-2")).toBe(false);
    expect(result.size).toBe(2);
  });

  it("getUserLikes returns empty Set on error", async () => {
    mockFrom.mockImplementation(() => {
      const chain: Record<string, any> = {};
      chain.select = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: { message: "error" } }),
        }),
      });
      return chain;
    });

    const result = await getUserLikes(CONTEST_ID, USER_ID);

    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
  });
});
