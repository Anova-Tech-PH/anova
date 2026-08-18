import { describe, it, expect } from "vitest";
import { getSponsorsByEvent, getSponsorsByTier, getSponsorDetail } from "./sponsors";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createMockSupabaseClient, createMockSupabaseClientMultiTable } from "../test-helpers";

describe("getSponsorsByEvent", () => {
  it("returns sponsors with tier info", async () => {
    const sponsors = [{ id: "s1", name: "Acme", tier: { id: "t1", name: "Gold" } }];
    const client = createMockSupabaseClient({ data: sponsors }) as unknown as SupabaseClient;
    const result = await getSponsorsByEvent(client, "event-1");
    expect(result).toEqual(sponsors);
    expect(client.from).toHaveBeenCalledWith("sponsors");
  });

  it("throws on error", async () => {
    const client = createMockSupabaseClient({ error: { message: "fail" } }) as unknown as SupabaseClient;
    await expect(getSponsorsByEvent(client, "event-1")).rejects.toThrow("fail");
  });
});

describe("getSponsorsByTier", () => {
  it("returns sponsors grouped by tier", async () => {
    const tiers = [{ id: "t1", name: "Gold" }];
    const sponsors = [
      { id: "s1", name: "Acme", tier_id: "t1", tier: { id: "t1", name: "Gold" } },
      { id: "s2", name: "Beta", tier_id: null, tier: null },
    ];
    const client = createMockSupabaseClientMultiTable({
      sponsor_tiers: { data: tiers },
      sponsors: { data: sponsors },
    }) as unknown as SupabaseClient;

    const result = await getSponsorsByTier(client, "event-1");
    expect(result).toHaveLength(2);
    expect(result[0].tier).toEqual(tiers[0]);
    expect(result[0].sponsors).toHaveLength(1);
    expect(result[1].tier).toBeNull();
    expect(result[1].sponsors).toHaveLength(1);
  });

  it("throws if tiers query fails", async () => {
    const client = createMockSupabaseClientMultiTable({
      sponsor_tiers: { error: { message: "tiers fail" } },
      sponsors: { data: [] },
    }) as unknown as SupabaseClient;
    await expect(getSponsorsByTier(client, "event-1")).rejects.toThrow("tiers fail");
  });
});

describe("getSponsorDetail", () => {
  it("returns sponsor with documents and coupons", async () => {
    const sponsor = {
      id: "s1", name: "Acme",
      sponsor_documents: [{ id: "d1", title: "Brochure" }],
      sponsor_coupons: [{ id: "c1", code: "SAVE10" }],
    };
    const client = createMockSupabaseClient({ data: sponsor }) as unknown as SupabaseClient;
    const result = await getSponsorDetail(client, "s1");
    expect(result.documents).toEqual([{ id: "d1", title: "Brochure" }]);
    expect(result.coupons).toEqual([{ id: "c1", code: "SAVE10" }]);
    expect(client.from).toHaveBeenCalledWith("sponsors");
  });

  it("throws on error", async () => {
    const client = createMockSupabaseClient({ error: { message: "fail" } }) as unknown as SupabaseClient;
    await expect(getSponsorDetail(client, "s1")).rejects.toThrow("fail");
  });
});
