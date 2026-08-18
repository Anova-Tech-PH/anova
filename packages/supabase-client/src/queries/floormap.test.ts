import { describe, it, expect } from "vitest";
import { getFloormapsByEvent, getFloormapWithMarkers } from "./floormap";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createMockSupabaseClient } from "../test-helpers";

describe("getFloormapsByEvent", () => {
  it("returns floormaps for event", async () => {
    const maps = [{ id: "fm1", name: "Level 1", image_url: "https://img.com/map.png" }];
    const client = createMockSupabaseClient({ data: maps }) as unknown as SupabaseClient;
    const result = await getFloormapsByEvent(client, "event-1");
    expect(result).toEqual(maps);
    expect(client.from).toHaveBeenCalledWith("floormaps");
  });

  it("throws on error", async () => {
    const client = createMockSupabaseClient({ error: { message: "fail" } }) as unknown as SupabaseClient;
    await expect(getFloormapsByEvent(client, "event-1")).rejects.toThrow("fail");
  });
});

describe("getFloormapWithMarkers", () => {
  it("returns floormap with markers", async () => {
    const map = { id: "fm1", name: "Level 1", floormap_markers: [{ id: "m1", label: "Stage", x: 10, y: 20 }] };
    const client = createMockSupabaseClient({ data: map }) as unknown as SupabaseClient;
    const result = await getFloormapWithMarkers(client, "fm1");
    expect(result).toEqual(map);
    expect(client.from).toHaveBeenCalledWith("floormaps");
  });

  it("throws on error", async () => {
    const client = createMockSupabaseClient({ error: { message: "fail" } }) as unknown as SupabaseClient;
    await expect(getFloormapWithMarkers(client, "fm1")).rejects.toThrow("fail");
  });
});
