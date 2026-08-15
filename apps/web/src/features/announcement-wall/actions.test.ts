import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock supabase server client
vi.mock("@attendly/ui/supabase/server", () => {
  const chainable = () => {
    const obj: Record<string, unknown> = {
      select: () => obj,
      insert: () => obj,
      update: () => obj,
      delete: () => obj,
      upsert: () => obj,
      eq: () => obj,
      neq: () => obj,
      order: () => obj,
      limit: () => obj,
      single: () => Promise.resolve({ data: { id: "test-id", display_order: 0 }, error: null }),
      then: (resolve: (v: unknown) => void) =>
        resolve({ data: [{ display_order: 2 }], error: null, count: 1 }),
    };
    return obj;
  };

  const supabaseClient = {
    from: () => chainable(),
  };

  return {
    createClient: vi.fn(() => Promise.resolve(supabaseClient)),
  };
});

describe("announcement-wall/actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports upsertWallConfig", async () => {
    const { upsertWallConfig } = await import("./actions");
    expect(upsertWallConfig).toBeDefined();
    expect(typeof upsertWallConfig).toBe("function");
  });

  it("exports createCustomSlide", async () => {
    const { createCustomSlide } = await import("./actions");
    expect(createCustomSlide).toBeDefined();
    expect(typeof createCustomSlide).toBe("function");
  });

  it("exports updateCustomSlide", async () => {
    const { updateCustomSlide } = await import("./actions");
    expect(updateCustomSlide).toBeDefined();
    expect(typeof updateCustomSlide).toBe("function");
  });

  it("exports deleteCustomSlide", async () => {
    const { deleteCustomSlide } = await import("./actions");
    expect(deleteCustomSlide).toBeDefined();
    expect(typeof deleteCustomSlide).toBe("function");
  });
});
