import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockGt = vi.fn();
const mockOrder = vi.fn();

const mockFrom = vi.fn(() => ({
  select: mockSelect,
}));

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

import { validateTokenAndGetContext } from "./public-form-queries";

describe("validateTokenAndGetContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns speaker, event, and fields for a valid token", async () => {
    // Token lookup with joined data
    mockSelect.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({ gt: mockGt });
    mockGt.mockReturnValueOnce({ single: mockSingle });
    mockSingle.mockResolvedValueOnce({
      data: {
        speaker_id: "sp1",
        event_id: "e1",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        speakers: { id: "sp1", name: "Alice", email: "a@b.com", title: null, company: null, bio: null, photo: null, linkedin_url: null, twitter_handle: null, website_url: null },
        events: { id: "e1", title: "My Event" },
      },
      error: null,
    });

    // Fields lookup
    mockSelect.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({ order: mockOrder });
    mockOrder.mockResolvedValueOnce({
      data: [{ field_key: "name", label: "Full Name", included: true, required: true }],
      error: null,
    });

    const result = await validateTokenAndGetContext("abc123");

    expect(result).toEqual(
      expect.objectContaining({
        speaker: expect.objectContaining({ id: "sp1", name: "Alice" }),
        event: expect.objectContaining({ title: "My Event" }),
        fields: expect.arrayContaining([expect.objectContaining({ field_key: "name" })]),
      })
    );
  });

  it("returns null for invalid token", async () => {
    mockSelect.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({ gt: mockGt });
    mockGt.mockReturnValueOnce({ single: mockSingle });
    mockSingle.mockResolvedValueOnce({ data: null, error: { code: "PGRST116", message: "not found" } });

    const result = await validateTokenAndGetContext("bad-token");
    expect(result).toBeNull();
  });
});
