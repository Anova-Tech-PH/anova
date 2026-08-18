import { describe, it, expect } from "vitest";
import { getSpeakers, getSpeakerDetail } from "./speakers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createMockSupabaseClient } from "../test-helpers";

describe("getSpeakers", () => {
  it("returns speakers for an event", async () => {
    const speakers = [{ id: "sp1", name: "John Doe" }];
    const client = createMockSupabaseClient({ data: speakers }) as unknown as SupabaseClient;
    const result = await getSpeakers(client, "event-1");
    expect(result).toEqual(speakers);
    expect(client.from).toHaveBeenCalledWith("speakers");
  });

  it("throws on error", async () => {
    const client = createMockSupabaseClient({ error: { message: "fail" } }) as unknown as SupabaseClient;
    await expect(getSpeakers(client, "event-1")).rejects.toThrow("fail");
  });
});

describe("getSpeakerDetail", () => {
  it("returns speaker with sessions", async () => {
    const speaker = { id: "sp1", name: "Jane", session_speakers: [] };
    const client = createMockSupabaseClient({ data: speaker }) as unknown as SupabaseClient;
    const result = await getSpeakerDetail(client, "sp1");
    expect(result).toEqual(speaker);
    expect(client.from).toHaveBeenCalledWith("speakers");
  });

  it("throws on error", async () => {
    const client = createMockSupabaseClient({ error: { message: "fail" } }) as unknown as SupabaseClient;
    await expect(getSpeakerDetail(client, "sp1")).rejects.toThrow("fail");
  });
});
