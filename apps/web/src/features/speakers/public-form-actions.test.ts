import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockGt = vi.fn();

const mockFrom = vi.fn(() => ({
  select: mockSelect,
  update: mockUpdate,
}));

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

import { submitSpeakerForm } from "./public-form-actions";

describe("submitSpeakerForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates speaker data for a valid token", async () => {
    mockSelect.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({ gt: mockGt });
    mockGt.mockReturnValueOnce({ single: mockSingle });
    mockSingle.mockResolvedValueOnce({
      data: { speaker_id: "sp1", event_id: "e1", expires_at: new Date(Date.now() + 86400000).toISOString() },
      error: null,
    });

    mockUpdate.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({ error: null });

    await submitSpeakerForm("valid-token", { name: "Alice Updated", bio: "New bio" });

    expect(mockFrom).toHaveBeenCalledWith("speakers");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Alice Updated",
        bio: "New bio",
        updated_at: expect.any(String),
      })
    );
  });

  it("throws for an invalid token", async () => {
    mockSelect.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({ gt: mockGt });
    mockGt.mockReturnValueOnce({ single: mockSingle });
    mockSingle.mockResolvedValueOnce({ data: null, error: { code: "PGRST116", message: "not found" } });

    await expect(submitSpeakerForm("bad-token", { name: "Alice" })).rejects.toThrow("Invalid or expired form link");
  });

  it("filters out non-allowed field keys", async () => {
    mockSelect.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({ gt: mockGt });
    mockGt.mockReturnValueOnce({ single: mockSingle });
    mockSingle.mockResolvedValueOnce({
      data: { speaker_id: "sp1", event_id: "e1", expires_at: new Date(Date.now() + 86400000).toISOString() },
      error: null,
    });

    mockUpdate.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({ error: null });

    await submitSpeakerForm("valid-token", {
      name: "Alice",
      is_admin: "true",  // not an allowed key
      event_id: "hacked", // not an allowed key
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.not.objectContaining({
        is_admin: "true",
        event_id: "hacked",
      })
    );
  });
});
