import { describe, it, expect, vi } from "vitest";
import { saveSessionNote } from "./session-notes";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("saveSessionNote", () => {
  it("upserts note with correct fields", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const chain: Record<string, unknown> = {};
    const methods = ["select", "eq", "neq", "in", "order", "delete", "single"];
    for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain);
    chain.upsert = upsert;

    const client = {
      from: vi.fn().mockReturnValue(chain),
    } as unknown as SupabaseClient;

    await saveSessionNote(client, "session-1", "user-1", "My notes here");
    expect(client.from).toHaveBeenCalledWith("session_notes");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: "session-1",
        user_id: "user-1",
        content: "My notes here",
      }),
      { onConflict: "session_id,user_id" }
    );
  });

  it("throws on error", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: { message: "fail" } });
    const chain: Record<string, unknown> = {};
    chain.upsert = upsert;
    const client = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;
    await expect(saveSessionNote(client, "s1", "u1", "text")).rejects.toThrow("fail");
  });
});
