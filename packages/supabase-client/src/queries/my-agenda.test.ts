import { describe, it, expect } from "vitest";
import { getMyAgendaSessions, getUserBookmarks } from "./my-agenda";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createMockSupabaseClientMultiTable, createMockSupabaseClient } from "../test-helpers";

describe("getMyAgendaSessions", () => {
  it("returns bookmarked sessions for user", async () => {
    const bookmarks = [{ session_id: "s1" }, { session_id: "s2" }];
    const sessions = [
      { id: "s1", title: "Talk 1" },
      { id: "s2", title: "Talk 2" },
    ];
    const client = createMockSupabaseClientMultiTable({
      session_bookmarks: { data: bookmarks },
      sessions: { data: sessions },
    }) as unknown as SupabaseClient;

    const result = await getMyAgendaSessions(client, "event-1", "user-1");
    expect(result).toEqual(sessions);
    expect(client.from).toHaveBeenCalledWith("session_bookmarks");
  });

  it("returns empty array when no bookmarks", async () => {
    const client = createMockSupabaseClientMultiTable({
      session_bookmarks: { data: [] },
      sessions: { data: [] },
    }) as unknown as SupabaseClient;

    const result = await getMyAgendaSessions(client, "event-1", "user-1");
    expect(result).toEqual([]);
  });
});

describe("getUserBookmarks", () => {
  it("returns bookmark session IDs", async () => {
    const bookmarks = [{ session_id: "s1" }, { session_id: "s2" }];
    const client = createMockSupabaseClient({ data: bookmarks }) as unknown as SupabaseClient;
    const result = await getUserBookmarks(client, "user-1");
    expect(result).toEqual(["s1", "s2"]);
    expect(client.from).toHaveBeenCalledWith("session_bookmarks");
  });

  it("returns empty array when no bookmarks", async () => {
    const client = createMockSupabaseClient({ data: [] }) as unknown as SupabaseClient;
    const result = await getUserBookmarks(client, "user-1");
    expect(result).toEqual([]);
  });
});
