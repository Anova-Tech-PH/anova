import { describe, it, expect, vi } from "vitest";

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: vi.fn(() => ({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            order: mockOrder.mockReturnValue({
              data: [
                {
                  id: "item-1",
                  event_id: "evt-1",
                  template: "parking",
                  title: "Parking Info",
                  content: "Free parking available",
                  sort_order: 0,
                  created_at: "2026-01-01T00:00:00Z",
                  updated_at: "2026-01-01T00:00:00Z",
                },
              ],
              error: null,
            }),
          }),
        }),
      })),
    })
  ),
}));

describe("getLogisticsItems", () => {
  it("returns logistics items sorted by sort_order", async () => {
    const { getLogisticsItems } = await import("./queries");
    const items = await getLogisticsItems("evt-1");

    expect(items).toHaveLength(1);
    expect(items[0].template).toBe("parking");
    expect(items[0].title).toBe("Parking Info");
    expect(mockOrder).toHaveBeenCalledWith("sort_order", { ascending: true });
  });
});
