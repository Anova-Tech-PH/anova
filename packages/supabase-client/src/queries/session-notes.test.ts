import { describe, it, expect } from "vitest";
import { getMyNotes, getSessionNote } from "./session-notes";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createMockSupabaseClient } from "../test-helpers";

describe("getMyNotes", () => {
  it("returns notes for user in event", async () => {
    const notes = [
      { id: "n1", session_id: "s1", content: "notes", sessions: { event_id: "event-1", title: "Talk" } },
      { id: "n2", session_id: "s2", content: "more", sessions: { event_id: "event-2", title: "Other" } },
    ];
    const client = createMockSupabaseClient({ data: notes }) as unknown as SupabaseClient;
    const result = await getMyNotes(client, "event-1", "user-1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("n1");
    expect(client.from).toHaveBeenCalledWith("session_notes");
  });

  it("returns empty array when no notes", async () => {
    const client = createMockSupabaseClient({ data: [] }) as unknown as SupabaseClient;
    const result = await getMyNotes(client, "event-1", "user-1");
    expect(result).toEqual([]);
  });
});

describe("getSessionNote", () => {
  it("returns single note", async () => {
    const note = { id: "n1", content: "My notes", updated_at: "2026-01-01" };
    const client = createMockSupabaseClient({ data: note }) as unknown as SupabaseClient;
    const result = await getSessionNote(client, "s1", "user-1");
    expect(result).toEqual(note);
    expect(client.from).toHaveBeenCalledWith("session_notes");
  });

  it("returns null when no note found", async () => {
    const client = createMockSupabaseClient({ data: null, error: { message: "not found", code: "PGRST116" } }) as unknown as SupabaseClient;
    const result = await getSessionNote(client, "s1", "user-1");
    expect(result).toBeNull();
  });
});
