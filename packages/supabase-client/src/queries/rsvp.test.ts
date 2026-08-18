import { describe, it, expect } from "vitest";
import { getUserRsvps, getSessionRsvpStatus } from "./rsvp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createMockSupabaseClientMultiTable } from "../test-helpers";

describe("getUserRsvps", () => {
  it("returns user RSVPs for event sessions", async () => {
    const sessions = [{ id: "s1" }, { id: "s2" }];
    const rsvps = [{ id: "r1", session_id: "s1", user_id: "u1", status: "confirmed" }];
    const client = createMockSupabaseClientMultiTable({
      sessions: { data: sessions },
      session_rsvps: { data: rsvps },
    }) as unknown as SupabaseClient;

    const result = await getUserRsvps(client, "event-1", "user-1");
    expect(result).toEqual(rsvps);
    expect(client.from).toHaveBeenCalledWith("sessions");
    expect(client.from).toHaveBeenCalledWith("session_rsvps");
  });

  it("returns empty array when no sessions", async () => {
    const client = createMockSupabaseClientMultiTable({
      sessions: { data: [] },
      session_rsvps: { data: [] },
    }) as unknown as SupabaseClient;

    const result = await getUserRsvps(client, "event-1", "user-1");
    expect(result).toEqual([]);
  });
});

describe("getSessionRsvpStatus", () => {
  it("returns RSVP status for a session", async () => {
    const client = createMockSupabaseClientMultiTable({
      session_rsvps: { data: { status: "confirmed" }, count: 5 },
      sessions: { data: { capacity: 50 } },
    }) as unknown as SupabaseClient;

    const result = await getSessionRsvpStatus(client, "s1", "user-1");
    expect(result.status).toBe("confirmed");
    expect(result.confirmedCount).toBe(5);
    expect(result.capacity).toBe(50);
  });

  it("returns null status when no user", async () => {
    const client = createMockSupabaseClientMultiTable({
      session_rsvps: { data: null, count: 0 },
      sessions: { data: { capacity: 50 } },
    }) as unknown as SupabaseClient;

    const result = await getSessionRsvpStatus(client, "s1");
    expect(result.status).toBeNull();
  });
});
