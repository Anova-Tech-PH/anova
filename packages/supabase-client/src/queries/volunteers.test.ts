import { describe, it, expect } from "vitest";
import { getPublicVolunteerInfo, getVolunteerSettings } from "./volunteers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createMockSupabaseClient, createMockSupabaseClientMultiTable } from "../test-helpers";

describe("getVolunteerSettings", () => {
  it("returns volunteer settings", async () => {
    const settings = { id: "vs1", event_id: "event-1", is_published: true, title: "Volunteer" };
    const client = createMockSupabaseClient({ data: settings }) as unknown as SupabaseClient;
    const result = await getVolunteerSettings(client, "event-1");
    expect(result).toEqual(settings);
    expect(client.from).toHaveBeenCalledWith("volunteer_settings");
  });

  it("returns null when no settings", async () => {
    const client = createMockSupabaseClient({ data: null, error: { message: "not found" } }) as unknown as SupabaseClient;
    const result = await getVolunteerSettings(client, "event-1");
    expect(result).toBeNull();
  });
});

describe("getPublicVolunteerInfo", () => {
  it("returns settings, roles, questions, and event dates", async () => {
    const client = createMockSupabaseClientMultiTable({
      volunteer_settings: { data: { id: "vs1", is_published: true } },
      volunteer_roles: { data: [{ id: "r1", name: "Usher" }] },
      volunteer_questions: { data: [{ id: "q1", question_text: "Why?" }] },
      events: { data: { start_date: "2026-01-01", end_date: "2026-01-02" } },
    }) as unknown as SupabaseClient;

    const result = await getPublicVolunteerInfo(client, "event-1");
    expect(result).not.toBeNull();
    expect(result!.settings.id).toBe("vs1");
    expect(result!.roles).toHaveLength(1);
    expect(result!.questions).toHaveLength(1);
  });

  it("returns null when settings not published", async () => {
    const client = createMockSupabaseClientMultiTable({
      volunteer_settings: { data: null, error: { message: "not found" } },
      volunteer_roles: { data: [] },
      volunteer_questions: { data: [] },
      events: { data: null, error: { message: "not found" } },
    }) as unknown as SupabaseClient;

    const result = await getPublicVolunteerInfo(client, "event-1");
    expect(result).toBeNull();
  });
});
