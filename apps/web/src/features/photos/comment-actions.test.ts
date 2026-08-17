import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock the Supabase server client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

// Helper to build chainable query mocks
function chainable(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "insert", "delete", "update", "eq", "single", "range", "order", "in"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  Object.assign(chain, overrides);
  return chain;
}

import { addComment, deleteComment } from "./comment-actions";

describe("addComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(addComment("photo-1", "Nice photo!")).rejects.toThrow("Not authenticated");
  });

  it("throws if content exceeds 140 characters", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const longContent = "a".repeat(141);

    await expect(addComment("photo-1", longContent)).rejects.toThrow(
      "Comment must be 140 characters or less"
    );
  });

  it("inserts into photo_comments table and returns the comment", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const createdComment = {
      id: "comment-1",
      photo_id: "photo-1",
      user_id: "user-1",
      content: "Nice photo!",
      created_at: "2026-08-17T00:00:00Z",
    };

    const chain = chainable({
      single: vi.fn().mockResolvedValue({ data: createdComment, error: null }),
    });
    chain.insert = vi.fn().mockReturnValue(chain);
    mockSupabase.from.mockReturnValue(chain);

    const result = await addComment("photo-1", "Nice photo!");

    expect(mockSupabase.from).toHaveBeenCalledWith("photo_comments");
    expect(chain.insert).toHaveBeenCalledWith({
      photo_id: "photo-1",
      user_id: "user-1",
      content: "Nice photo!",
    });
    expect(result).toEqual(createdComment);
  });
});

describe("deleteComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(deleteComment("comment-1")).rejects.toThrow("Not authenticated");
  });

  it("deletes from photo_comments by id", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const deleteChain = chainable();
    deleteChain.eq = vi.fn().mockReturnValue({ error: null });
    const deleteFn = vi.fn().mockReturnValue(deleteChain);
    mockSupabase.from.mockReturnValue({ delete: deleteFn });

    await deleteComment("comment-1");

    expect(mockSupabase.from).toHaveBeenCalledWith("photo_comments");
    expect(deleteFn).toHaveBeenCalled();
    expect(deleteChain.eq).toHaveBeenCalledWith("id", "comment-1");
  });
});
