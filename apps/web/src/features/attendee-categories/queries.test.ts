import { describe, it, expect, vi, beforeEach } from "vitest";

function createQueryMock(result: { data?: unknown; error?: unknown }) {
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) => resolve(result);
      }
      return vi.fn(() => new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

const mockFrom = vi.fn();

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

describe("getCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns categories ordered by sort_order", async () => {
    const categories = [
      { id: "c1", event_id: "e1", name: "VIP", color: "blue", is_visible_in_directory: true, sort_order: 0, created_at: "2026-01-01", updated_at: "2026-01-01" },
      { id: "c2", event_id: "e1", name: "Speaker", color: "green", is_visible_in_directory: true, sort_order: 1, created_at: "2026-01-01", updated_at: "2026-01-01" },
    ];
    mockFrom.mockReturnValue(createQueryMock({ data: categories, error: null }));

    const { getCategories } = await import("./queries");
    const result = await getCategories("e1");

    expect(mockFrom).toHaveBeenCalledWith("attendee_categories");
    expect(result).toEqual(categories);
  });

  it("throws on error", async () => {
    mockFrom.mockReturnValue(createQueryMock({ data: null, error: { message: "DB error" } }));

    const { getCategories } = await import("./queries");
    await expect(getCategories("e1")).rejects.toThrow("DB error");
  });
});

describe("getVisibilityMatrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns visibility pairs", async () => {
    const pairs = [
      { viewer_category_id: "c1", visible_category_id: "c2" },
      { viewer_category_id: "c2", visible_category_id: "c1" },
    ];
    mockFrom.mockReturnValue(createQueryMock({ data: pairs, error: null }));

    const { getVisibilityMatrix } = await import("./queries");
    const result = await getVisibilityMatrix(["c1", "c2"]);

    expect(mockFrom).toHaveBeenCalledWith("category_visibility");
    expect(result).toEqual(pairs);
  });

  it("returns empty array for empty input", async () => {
    const { getVisibilityMatrix } = await import("./queries");
    const result = await getVisibilityMatrix([]);

    expect(mockFrom).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});

describe("getTicketCategoryMappings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mappings", async () => {
    const mappings = [
      { ticket_type_id: "t1", category_id: "c1" },
      { ticket_type_id: "t2", category_id: "c2" },
    ];
    mockFrom.mockReturnValue(createQueryMock({ data: mappings, error: null }));

    const { getTicketCategoryMappings } = await import("./queries");
    const result = await getTicketCategoryMappings(["t1", "t2"]);

    expect(mockFrom).toHaveBeenCalledWith("ticket_type_categories");
    expect(result).toEqual(mappings);
  });

  it("returns empty array for empty input", async () => {
    const { getTicketCategoryMappings } = await import("./queries");
    const result = await getTicketCategoryMappings([]);

    expect(mockFrom).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
