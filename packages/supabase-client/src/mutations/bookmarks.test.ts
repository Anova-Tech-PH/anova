import { describe, it, expect, vi } from "vitest";
import { toggleSessionBookmark } from "./bookmarks";
import type { SupabaseClient } from "@supabase/supabase-js";

function mockClient(existingBookmark: boolean) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "neq", "in", "not", "is", "or", "order", "limit", "range", "delete", "ilike", "filter"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue({
    data: existingBookmark ? { user_id: "user-1" } : null,
    error: existingBookmark ? null : { code: "PGRST116", message: "not found" },
  });
  chain.insert = vi.fn().mockResolvedValue({ error: null });
  chain.then = (resolve: (v: unknown) => void) => resolve({ data: null, error: null });

  return {
    from: vi.fn().mockReturnValue(chain),
  } as unknown as SupabaseClient;
}

describe("toggleSessionBookmark", () => {
  it("adds bookmark when none exists", async () => {
    const client = mockClient(false);
    const result = await toggleSessionBookmark(client, "session-1", "user-1");
    expect(result.bookmarked).toBe(true);
    expect(client.from).toHaveBeenCalledWith("session_bookmarks");
  });

  it("removes bookmark when one exists", async () => {
    const client = mockClient(true);
    const result = await toggleSessionBookmark(client, "session-1", "user-1");
    expect(result.bookmarked).toBe(false);
  });
});
