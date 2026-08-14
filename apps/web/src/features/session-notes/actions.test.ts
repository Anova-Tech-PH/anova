import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveNote } from "./actions";

// Mock the Supabase client
const mockUpsert = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn(() => ({
      upsert: mockUpsert,
    })),
  })),
}));

describe("saveNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(saveNote("session-1", "my note")).rejects.toThrow(
      "Not authenticated"
    );
  });

  it("upserts a note for authenticated user", async () => {
    const mockUser = { id: "user-123" };
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockUpsert.mockResolvedValue({ error: null });

    await saveNote("session-1", "my note content");

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: "session-1",
        user_id: "user-123",
        content: "my note content",
        updated_at: expect.any(String),
      }),
      { onConflict: "session_id,user_id" }
    );
  });

  it("throws when upsert fails", async () => {
    const mockUser = { id: "user-123" };
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockUpsert.mockResolvedValue({
      error: { message: "Database error", code: "42P01" },
    });

    await expect(saveNote("session-1", "note")).rejects.toThrow();
  });
});
