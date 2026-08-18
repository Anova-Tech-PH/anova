import { describe, it, expect } from "vitest";
import { getActivityFeed } from "./activity-feed";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createMockSupabaseClient } from "../test-helpers";

describe("getActivityFeed", () => {
  it("returns feed items with pagination", async () => {
    const items = [{ id: "af1", type: "announcement", created_at: "2026-01-01" }];
    const client = createMockSupabaseClient({ data: items, count: 1 }) as unknown as SupabaseClient;
    const result = await getActivityFeed(client, "event-1");
    expect(result.items).toEqual(items);
    expect(result.total).toBe(1);
    expect(client.from).toHaveBeenCalledWith("activity_feed");
  });

  it("throws on error", async () => {
    const client = createMockSupabaseClient({ error: { message: "fail" } }) as unknown as SupabaseClient;
    await expect(getActivityFeed(client, "event-1")).rejects.toThrow("fail");
  });
});
