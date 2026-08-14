import { describe, it, expect, vi, beforeEach } from "vitest";
import { revalidatePath } from "next/cache";

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
const mockAuth = {
  getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
};

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom, auth: mockAuth })),
}));

describe("createCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  it("creates and returns category", async () => {
    const created = { id: "c1", event_id: "e1", name: "VIP", color: "blue", is_visible_in_directory: true, sort_order: 0 };
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        // max sort_order query
        return createQueryMock({ data: [{ sort_order: 2 }], error: null });
      }
      if (callIdx === 2) {
        // insert category
        return createQueryMock({ data: created, error: null });
      }
      if (callIdx === 3) {
        // fetch existing categories for visibility
        return createQueryMock({ data: [{ id: "c0" }], error: null });
      }
      // insert visibility rows
      return createQueryMock({ data: null, error: null });
    });

    const { createCategory } = await import("./actions");
    const result = await createCategory("e1", { name: "VIP", color: "blue" });

    expect(result).toHaveProperty("id", "c1");
    expect(revalidatePath).toHaveBeenCalledWith("/events/e1/attendee-categories");
  });

  it("throws if name empty", async () => {
    const { createCategory } = await import("./actions");
    await expect(createCategory("e1", { name: "", color: "blue" })).rejects.toThrow();
  });

  it("throws if not authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const { createCategory } = await import("./actions");
    await expect(createCategory("e1", { name: "VIP", color: "blue" })).rejects.toThrow();
  });

  it("throws if invalid color", async () => {
    const { createCategory } = await import("./actions");
    await expect(createCategory("e1", { name: "VIP", color: "neon" })).rejects.toThrow();
  });
});

describe("updateCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  it("updates category", async () => {
    mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

    const { updateCategory } = await import("./actions");
    await updateCategory("e1", "c1", { name: "Updated" });

    expect(mockFrom).toHaveBeenCalledWith("attendee_categories");
    expect(revalidatePath).toHaveBeenCalledWith("/events/e1/attendee-categories");
  });

  it("throws if not authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const { updateCategory } = await import("./actions");
    await expect(updateCategory("e1", "c1", { name: "X" })).rejects.toThrow();
  });
});

describe("deleteCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  it("deletes category", async () => {
    mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

    const { deleteCategory } = await import("./actions");
    await deleteCategory("e1", "c1");

    expect(mockFrom).toHaveBeenCalledWith("attendee_categories");
    expect(revalidatePath).toHaveBeenCalledWith("/events/e1/attendee-categories");
  });

  it("throws if not authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const { deleteCategory } = await import("./actions");
    await expect(deleteCategory("e1", "c1")).rejects.toThrow();
  });
});

describe("setTicketCategoryMapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  it("sets mapping", async () => {
    mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

    const { setTicketCategoryMapping } = await import("./actions");
    await setTicketCategoryMapping("e1", "t1", "c1");

    expect(revalidatePath).toHaveBeenCalledWith("/events/e1/attendee-categories");
    expect(revalidatePath).toHaveBeenCalledWith("/events/e1/tickets");
  });

  it("clears mapping when null", async () => {
    mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

    const { setTicketCategoryMapping } = await import("./actions");
    await setTicketCategoryMapping("e1", "t1", null);

    expect(revalidatePath).toHaveBeenCalledWith("/events/e1/attendee-categories");
  });
});

describe("toggleVisibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  it("inserts when enabling", async () => {
    mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

    const { toggleVisibility } = await import("./actions");
    await toggleVisibility("e1", "c1", "c2", true);

    expect(mockFrom).toHaveBeenCalledWith("category_visibility");
    expect(revalidatePath).toHaveBeenCalledWith("/events/e1/attendee-categories");
  });

  it("deletes when disabling", async () => {
    mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

    const { toggleVisibility } = await import("./actions");
    await toggleVisibility("e1", "c1", "c2", false);

    expect(mockFrom).toHaveBeenCalledWith("category_visibility");
    expect(revalidatePath).toHaveBeenCalledWith("/events/e1/attendee-categories");
  });
});
