import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockInsert = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({
      data: {
        id: "frame-1",
        event_id: "evt-1",
        label: "Speaker",
        color: "#3B82F6",
        sort_order: 0,
        created_at: "2026-08-17T00:00:00Z",
      },
      error: null,
    }),
  }),
});
const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
const mockDelete = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
const mockSelect = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({
    order: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  }),
});

const mockFrom = vi.fn(() => ({
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  select: mockSelect,
}));

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

describe("Profile Frame Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createProfileFrame", () => {
    it("inserts a new frame into profile_photo_frames", async () => {
      const { createProfileFrame } = await import("./actions");
      const result = await createProfileFrame("evt-1", "Speaker", "#3B82F6");

      expect(mockFrom).toHaveBeenCalledWith("profile_photo_frames");
      expect(mockInsert).toHaveBeenCalled();
      expect(result.id).toBe("frame-1");
      expect(result.label).toBe("Speaker");
      expect(result.color).toBe("#3B82F6");
    });
  });

  describe("updateProfileFrame", () => {
    it("updates an existing frame", async () => {
      const { updateProfileFrame } = await import("./actions");
      await updateProfileFrame("frame-1", { label: "VIP", color: "#EF4444" });

      expect(mockFrom).toHaveBeenCalledWith("profile_photo_frames");
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe("deleteProfileFrame", () => {
    it("deletes a frame", async () => {
      const { deleteProfileFrame } = await import("./actions");
      await deleteProfileFrame("frame-1");

      expect(mockFrom).toHaveBeenCalledWith("profile_photo_frames");
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
