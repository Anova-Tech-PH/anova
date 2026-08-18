import { describe, it, expect } from "vitest";
import { getLogisticsItems } from "./logistics";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createMockSupabaseClient } from "../test-helpers";

describe("getLogisticsItems", () => {
  it("returns logistics items for event", async () => {
    const items = [{ id: "1", title: "Parking", sort_order: 1 }];
    const client = createMockSupabaseClient({ data: items }) as unknown as SupabaseClient;
    const result = await getLogisticsItems(client, "event-1");
    expect(result).toEqual(items);
    expect(client.from).toHaveBeenCalledWith("logistics_items");
  });

  it("throws on error", async () => {
    const client = createMockSupabaseClient({ error: { message: "fail" } }) as unknown as SupabaseClient;
    await expect(getLogisticsItems(client, "event-1")).rejects.toThrow("fail");
  });
});
