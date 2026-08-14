import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Supabase mock plumbing ───────────────────────────────────────────
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockInsert = vi.fn();
const mockUpsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockRpc = vi.fn();

// Chainable builder — every method returns the builder so .from().upsert().select() etc. works
const builder = () => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = mockSelect.mockReturnValue(chain);
  chain.single = mockSingle;
  chain.insert = mockInsert.mockReturnValue(chain);
  chain.upsert = mockUpsert.mockReturnValue(chain);
  chain.update = mockUpdate.mockReturnValue(chain);
  chain.delete = mockDelete.mockReturnValue(chain);
  chain.eq = mockEq.mockReturnValue(chain);
  return chain;
};

const mockFrom = vi.fn(() => builder());

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

// Import after mock
import {
  enableGamification,
  disableGamification,
  updatePointRule,
  updateGamificationConfig,
  createBadge,
  updateBadge,
  deleteBadge,
  recalculateLeaderboard,
} from "./actions";

// ── Helpers ──────────────────────────────────────────────────────────
const EVENT_ID = "evt-001";
const RULE_ID = "rule-001";
const BADGE_ID = "badge-001";

describe("gamification actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default success responses
    mockUpsert.mockReturnValue({ select: mockSelect, error: null });
    mockSelect.mockReturnValue({ single: mockSingle, error: null });
    mockSingle.mockResolvedValue({ data: {}, error: null });
    mockInsert.mockReturnValue({ select: mockSelect, error: null });
    mockUpdate.mockReturnValue({ eq: mockEq, error: null });
    mockDelete.mockReturnValue({ eq: mockEq, error: null });
    mockEq.mockReturnValue({ eq: mockEq, error: null, select: mockSelect });
    mockRpc.mockResolvedValue({ error: null });
  });

  // ── enableGamification ─────────────────────────────────────────────
  it("enableGamification upserts config and seeds default rules", async () => {
    // Make the from() calls return chainable mocks with success
    mockFrom.mockImplementation(() => {
      const chain: Record<string, any> = {};
      chain.upsert = vi.fn().mockReturnValue({ error: null, select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: "cfg-1" }, error: null }) }) });
      chain.select = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) });
      chain.insert = vi.fn().mockResolvedValue({ error: null });
      return chain;
    });

    await enableGamification(EVENT_ID);

    // Should have called from() for gamification_configs, gamification_point_rules, gamification_badge_definitions
    const tableNames = mockFrom.mock.calls.map((c: unknown[]) => c[0]);
    expect(tableNames).toContain("gamification_configs");
    expect(tableNames).toContain("gamification_point_rules");
    expect(tableNames).toContain("gamification_badge_definitions");
  });

  // ── disableGamification ────────────────────────────────────────────
  it("disableGamification updates config.enabled to false", async () => {
    mockFrom.mockImplementation(() => {
      const chain: Record<string, any> = {};
      chain.update = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      return chain;
    });

    await disableGamification(EVENT_ID);

    // from("gamification_configs") should be called
    expect(mockFrom).toHaveBeenCalledWith("gamification_configs");

    // The update call should include enabled: false
    const chain = mockFrom.mock.results[0].value;
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false })
    );
  });

  // ── updatePointRule ────────────────────────────────────────────────
  it("updatePointRule updates the rule", async () => {
    mockFrom.mockImplementation(() => {
      const chain: Record<string, any> = {};
      const eqFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      chain.update = vi.fn().mockReturnValue({ eq: eqFn });
      return chain;
    });

    await updatePointRule(EVENT_ID, RULE_ID, { points: 25, enabled: true });

    expect(mockFrom).toHaveBeenCalledWith("gamification_point_rules");
    const chain = mockFrom.mock.results[0].value;
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ points: 25, enabled: true })
    );
  });

  // ── updateGamificationConfig ───────────────────────────────────────
  it("updateGamificationConfig updates config fields", async () => {
    mockFrom.mockImplementation(() => {
      const chain: Record<string, any> = {};
      chain.update = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      return chain;
    });

    await updateGamificationConfig(EVENT_ID, {
      leaderboard_title: "Top Players",
      hide_organizers: true,
    });

    expect(mockFrom).toHaveBeenCalledWith("gamification_configs");
    const chain = mockFrom.mock.results[0].value;
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        leaderboard_title: "Top Players",
        hide_organizers: true,
      })
    );
  });

  // ── createBadge ────────────────────────────────────────────────────
  it("createBadge inserts a badge_definition and returns it", async () => {
    const badgeData = {
      name: "Test Badge",
      criteria_type: "points_threshold" as const,
      criteria_value: { threshold: 50 },
      icon: "star",
    };
    const returnedBadge = { id: BADGE_ID, ...badgeData, event_id: EVENT_ID };

    mockFrom.mockImplementation(() => {
      const chain: Record<string, any> = {};
      chain.insert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: returnedBadge, error: null }),
        }),
      });
      return chain;
    });

    const result = await createBadge(EVENT_ID, badgeData);

    expect(mockFrom).toHaveBeenCalledWith("gamification_badge_definitions");
    expect(result).toEqual(returnedBadge);
  });

  // ── updateBadge ────────────────────────────────────────────────────
  it("updateBadge updates badge fields", async () => {
    mockFrom.mockImplementation(() => {
      const chain: Record<string, any> = {};
      const eqFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      chain.update = vi.fn().mockReturnValue({ eq: eqFn });
      return chain;
    });

    await updateBadge(EVENT_ID, BADGE_ID, { name: "Updated Badge" });

    expect(mockFrom).toHaveBeenCalledWith("gamification_badge_definitions");
  });

  // ── deleteBadge ────────────────────────────────────────────────────
  it("deleteBadge deletes the badge", async () => {
    mockFrom.mockImplementation(() => {
      const chain: Record<string, any> = {};
      const eqFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      chain.delete = vi.fn().mockReturnValue({ eq: eqFn });
      return chain;
    });

    await deleteBadge(EVENT_ID, BADGE_ID);

    expect(mockFrom).toHaveBeenCalledWith("gamification_badge_definitions");
  });

  // ── recalculateLeaderboard ─────────────────────────────────────────
  it("recalculateLeaderboard calls the RPC", async () => {
    mockRpc.mockResolvedValue({ error: null });

    await recalculateLeaderboard(EVENT_ID);

    expect(mockRpc).toHaveBeenCalledWith("recalculate_leaderboard", {
      _event_id: EVENT_ID,
    });
  });
});
