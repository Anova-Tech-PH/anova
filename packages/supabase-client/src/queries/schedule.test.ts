import { describe, it, expect, vi } from "vitest";
import { getScheduleData, getSessionsByEvent, getTracksByEvent } from "./schedule";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createMockSupabaseClient, createMockSupabaseClientMultiTable } from "../test-helpers";

describe("getTracksByEvent", () => {
  it("returns tracks for an event", async () => {
    const tracks = [{ id: "t1", name: "Main", color: "#000" }];
    const client = createMockSupabaseClient({ data: tracks }) as unknown as SupabaseClient;
    const result = await getTracksByEvent(client, "event-1");
    expect(result).toEqual(tracks);
    expect(client.from).toHaveBeenCalledWith("tracks");
  });

  it("throws on error", async () => {
    const client = createMockSupabaseClient({ error: { message: "fail" } }) as unknown as SupabaseClient;
    await expect(getTracksByEvent(client, "event-1")).rejects.toThrow("fail");
  });
});

describe("getSessionsByEvent", () => {
  it("returns sessions with tracks and speakers", async () => {
    const sessions = [{ id: "s1", title: "Session 1" }];
    const client = createMockSupabaseClient({ data: sessions }) as unknown as SupabaseClient;
    const result = await getSessionsByEvent(client, "event-1");
    expect(result).toEqual(sessions);
    expect(client.from).toHaveBeenCalledWith("sessions");
  });

  it("throws on error", async () => {
    const client = createMockSupabaseClient({ error: { message: "fail" } }) as unknown as SupabaseClient;
    await expect(getSessionsByEvent(client, "event-1")).rejects.toThrow("fail");
  });
});

describe("getScheduleData", () => {
  it("returns tracks, sessions, and event data", async () => {
    const tracks = [{ id: "t1", name: "Main" }];
    const sessions = [{ id: "s1", title: "Talk" }];
    const event = { start_date: "2026-01-01", end_date: "2026-01-02", timezone: "UTC" };
    const client = createMockSupabaseClientMultiTable({
      tracks: { data: tracks },
      sessions: { data: sessions },
      events: { data: event },
    }) as unknown as SupabaseClient;

    const result = await getScheduleData(client, "event-1");
    expect(result.tracks).toEqual(tracks);
    expect(result.sessions).toEqual(sessions);
    expect(result.event).toEqual(event);
  });

  it("throws if tracks query fails", async () => {
    const client = createMockSupabaseClientMultiTable({
      tracks: { error: { message: "tracks fail" } },
      sessions: { data: [] },
      events: { data: {} },
    }) as unknown as SupabaseClient;
    await expect(getScheduleData(client, "event-1")).rejects.toThrow("tracks fail");
  });

  it("throws if sessions query fails", async () => {
    const client = createMockSupabaseClientMultiTable({
      tracks: { data: [] },
      sessions: { error: { message: "sessions fail" } },
      events: { data: {} },
    }) as unknown as SupabaseClient;
    await expect(getScheduleData(client, "event-1")).rejects.toThrow("sessions fail");
  });
});
