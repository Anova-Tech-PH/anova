import { describe, it, expect, vi } from "vitest";
import { askQuestion, toggleUpvote } from "./session-qa";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("askQuestion", () => {
  it("inserts question with correct fields", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const chain: Record<string, unknown> = {};
    chain.insert = insert;

    const client = {
      from: vi.fn().mockReturnValue(chain),
    } as unknown as SupabaseClient;

    await askQuestion(client, {
      sessionId: "session-1",
      eventId: "event-1",
      userId: "user-1",
      content: "How does this work?",
      isAnonymous: false,
    });

    expect(client.from).toHaveBeenCalledWith("session_questions");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: "session-1",
        event_id: "event-1",
        user_id: "user-1",
        question_text: "How does this work?",
        is_anonymous: false,
        status: "approved",
      })
    );
  });

  it("throws on empty content", async () => {
    const client = {} as unknown as SupabaseClient;
    await expect(
      askQuestion(client, {
        sessionId: "s1",
        eventId: "e1",
        userId: "u1",
        content: "   ",
      })
    ).rejects.toThrow("Question cannot be empty");
  });
});

describe("toggleUpvote", () => {
  it("adds upvote when none exists", async () => {
    const chain: Record<string, unknown> = {};
    const methods = ["eq", "delete"];
    for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } });
    chain.insert = vi.fn().mockResolvedValue({ error: null });
    chain.select = vi.fn().mockReturnValue(chain);

    const client = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;
    const result = await toggleUpvote(client, "q1", "u1");
    expect(result.upvoted).toBe(true);
  });

  it("removes upvote when one exists", async () => {
    const chain: Record<string, unknown> = {};
    const methods = ["eq", "select"];
    for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue({ data: { id: "uv-1" }, error: null });
    chain.delete = vi.fn().mockReturnValue(chain);
    // After delete().eq().eq() needs to resolve
    const deleteChain: Record<string, unknown> = {};
    deleteChain.eq = vi.fn().mockReturnValue(deleteChain);
    deleteChain.then = (resolve: (v: unknown) => void) => resolve({ error: null });
    chain.delete = vi.fn().mockReturnValue(deleteChain);

    const client = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;
    const result = await toggleUpvote(client, "q1", "u1");
    expect(result.upvoted).toBe(false);
  });
});
