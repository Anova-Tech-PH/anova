import { describe, it, expect, vi } from "vitest";
import { getSidebarData } from "./sidebar";
import type { SupabaseClient } from "@supabase/supabase-js";

function createMockClient(options: {
  roomCount?: number;
  docCount?: number;
  logisticsCount?: number;
  attendeeCount?: number;
  communityCount?: number;
  unreadMessageCount?: number;
  gamificationEnabled?: boolean;
  surveyCount?: number;
  volunteerPublished?: boolean;
  contestCount?: number;
  triviaCount?: number;
  sponsorCount?: number;
  registrationCount?: number;
  certificatesEnabled?: boolean;
  userId?: string | null;
} = {}) {
  const {
    roomCount = 0,
    docCount = 0,
    logisticsCount = 0,
    attendeeCount = 0,
    communityCount = 0,
    unreadMessageCount = 0,
    gamificationEnabled = false,
    surveyCount = 0,
    volunteerPublished = false,
    contestCount = 0,
    triviaCount = 0,
    sponsorCount = 0,
    registrationCount = 0,
    certificatesEnabled = false,
    userId = null,
  } = options;

  const results: Record<string, unknown> = {
    breakout_rooms: { count: roomCount, data: null, error: null },
    event_documents: { count: docCount, data: null, error: null },
    logistics_items: { count: logisticsCount, data: null, error: null },
    attendee_profiles: { count: attendeeCount, data: null, error: null },
    community_topics: { count: communityCount, data: null, error: null },
    direct_messages: { count: unreadMessageCount, data: null, error: null },
    gamification_configs: {
      data: gamificationEnabled ? { enabled: true } : null,
      error: gamificationEnabled ? null : { code: "PGRST116", message: "not found" },
    },
    surveys: { count: surveyCount, data: null, error: null },
    volunteer_settings: {
      data: volunteerPublished ? { is_published: true } : null,
      error: volunteerPublished ? null : { code: "PGRST116", message: "not found" },
    },
    registrations: { count: registrationCount, data: null, error: null },
    contests: { count: contestCount, data: null, error: null },
    trivia_games: { count: triviaCount, data: null, error: null },
    sponsors: { count: sponsorCount, data: null, error: null },
    events: {
      data: { settings: certificatesEnabled ? { certificates_enabled: true } : {} },
      error: null,
    },
  };

  const buildChain = (table: string) => {
    const result = results[table] ?? { data: null, error: null, count: null };
    const chain: Record<string, unknown> = {};
    const methods = [
      "select", "eq", "neq", "gt", "gte", "lt", "lte",
      "in", "not", "is", "or", "order", "limit", "range",
      "ilike", "filter",
    ];
    for (const m of methods) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.then = (resolve: (val: unknown) => void) => resolve(result);
    chain.single = vi.fn().mockResolvedValue(result);
    chain.maybeSingle = vi.fn().mockResolvedValue(result);
    return chain;
  };

  return {
    from: vi.fn((table: string) => buildChain(table)),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
      }),
    },
  } as unknown as SupabaseClient;
}

describe("getSidebarData", () => {
  const eventId = "event-123";

  it("returns all-false defaults when event has no data", async () => {
    const client = createMockClient();
    const result = await getSidebarData(client, eventId);

    expect(result).toEqual({
      hasRooms: false,
      hasResources: false,
      hasLogistics: false,
      hasCertificates: false,
      attendeeCount: 0,
      communityCount: 0,
      unreadMessageCount: 0,
      hasLeaderboard: false,
      isRegistered: false,
      hasFeedback: false,
      hasContests: false,
      hasTrivia: false,
      hasPassport: false,
      hasVolunteer: false,
    });
  });

  it("returns true flags when data exists", async () => {
    const client = createMockClient({
      roomCount: 3,
      docCount: 5,
      logisticsCount: 2,
      attendeeCount: 42,
      communityCount: 7,
      surveyCount: 1,
      volunteerPublished: true,
      certificatesEnabled: true,
    });

    const result = await getSidebarData(client, eventId);

    expect(result.hasRooms).toBe(true);
    expect(result.hasResources).toBe(true);
    expect(result.hasLogistics).toBe(true);
    expect(result.hasCertificates).toBe(true);
    expect(result.attendeeCount).toBe(42);
    expect(result.communityCount).toBe(7);
    expect(result.hasFeedback).toBe(true);
    expect(result.hasVolunteer).toBe(true);
  });

  it("returns unread message count when user is authenticated", async () => {
    const client = createMockClient({
      userId: "user-456",
      unreadMessageCount: 3,
    });

    const result = await getSidebarData(client, eventId);
    expect(result.unreadMessageCount).toBe(3);
  });

  it("checks gamification sub-features when leaderboard is enabled", async () => {
    const client = createMockClient({
      gamificationEnabled: true,
      contestCount: 2,
      triviaCount: 1,
      sponsorCount: 3,
    });

    const result = await getSidebarData(client, eventId);
    expect(result.hasLeaderboard).toBe(true);
    expect(result.hasContests).toBe(true);
    expect(result.hasTrivia).toBe(true);
    expect(result.hasPassport).toBe(true);
  });

  it("returns isRegistered true when user has a registration", async () => {
    const client = createMockClient({
      userId: "user-789",
      registrationCount: 1,
    });

    const result = await getSidebarData(client, eventId);
    expect(result.isRegistered).toBe(true);
  });
});
