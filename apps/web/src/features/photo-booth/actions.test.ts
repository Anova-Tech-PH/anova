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
        message: "Welcome!",
        color: "#3B82F6",
        template: "banner_top",
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

describe("Photo Booth Frame Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createBoothFrame", () => {
    it("inserts a new frame into photo_booth_frames", async () => {
      const { createBoothFrame } = await import("./actions");
      const result = await createBoothFrame("evt-1", "banner_top", "Welcome!", "#3B82F6");

      expect(mockFrom).toHaveBeenCalledWith("photo_booth_frames");
      expect(mockInsert).toHaveBeenCalled();
      expect(result.id).toBe("frame-1");
      expect(result.template).toBe("banner_top");
      expect(result.message).toBe("Welcome!");
    });
  });

  describe("updateBoothFrame", () => {
    it("updates an existing frame", async () => {
      const { updateBoothFrame } = await import("./actions");
      await updateBoothFrame("frame-1", { message: "Updated!", color: "#EF4444" });

      expect(mockFrom).toHaveBeenCalledWith("photo_booth_frames");
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe("deleteBoothFrame", () => {
    it("deletes a frame", async () => {
      const { deleteBoothFrame } = await import("./actions");
      await deleteBoothFrame("frame-1");

      expect(mockFrom).toHaveBeenCalledWith("photo_booth_frames");
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
