import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockInsert = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({
      data: { id: "new-1", event_id: "evt-1", template: "parking", title: "Parking", content: "", sort_order: 0 },
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

describe("Logistics Item Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createLogisticsItem", () => {
    it("inserts a new item into logistics_items", async () => {
      const { createLogisticsItem } = await import("./actions");
      const result = await createLogisticsItem("evt-1", "parking", "Parking", "");

      expect(mockFrom).toHaveBeenCalledWith("logistics_items");
      expect(result.id).toBe("new-1");
    });
  });

  describe("updateLogisticsItem", () => {
    it("updates an existing item", async () => {
      const { updateLogisticsItem } = await import("./actions");
      await updateLogisticsItem("item-1", { title: "Updated" });

      expect(mockFrom).toHaveBeenCalledWith("logistics_items");
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe("deleteLogisticsItem", () => {
    it("deletes an item", async () => {
      const { deleteLogisticsItem } = await import("./actions");
      await deleteLogisticsItem("item-1");

      expect(mockFrom).toHaveBeenCalledWith("logistics_items");
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
