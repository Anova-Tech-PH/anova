import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@attendly/ui/supabase/server", () => {
  const mockFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  });
  return {
    createClient: vi.fn().mockResolvedValue({
      from: mockFrom,
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ error: null }),
          getPublicUrl: vi.fn().mockReturnValue({
            data: { publicUrl: "https://example.com/map.png" },
          }),
        }),
      },
    }),
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("floormap integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createFloormap validates image is required", async () => {
    const { createFloormap } = await import("./actions");
    const formData = new FormData();
    await expect(createFloormap("event-1", formData)).rejects.toThrow(
      "Image file is required"
    );
  });

  it("createFloormap validates file type", async () => {
    const { createFloormap } = await import("./actions");
    const formData = new FormData();
    formData.set(
      "image",
      new File(["data"], "test.txt", { type: "text/plain" })
    );
    await expect(createFloormap("event-1", formData)).rejects.toThrow(
      "File must be an image"
    );
  });

  it("createFloormap validates file size", async () => {
    const { createFloormap } = await import("./actions");
    const formData = new FormData();
    const bigData = new Uint8Array(11 * 1024 * 1024);
    formData.set(
      "image",
      new File([bigData], "big.png", { type: "image/png" })
    );
    await expect(createFloormap("event-1", formData)).rejects.toThrow(
      "Image must be under 10MB"
    );
  });

  it("exports all query functions", async () => {
    const queries = await import("./queries");
    expect(typeof queries.getFloormapsByEvent).toBe("function");
    expect(typeof queries.getFloormapWithMarkers).toBe("function");
    expect(typeof queries.getEventLocations).toBe("function");
  });

  it("exports all action functions", async () => {
    const actions = await import("./actions");
    expect(typeof actions.createFloormap).toBe("function");
    expect(typeof actions.updateFloormap).toBe("function");
    expect(typeof actions.deleteFloormap).toBe("function");
    expect(typeof actions.upsertMarker).toBe("function");
    expect(typeof actions.deleteMarker).toBe("function");
  });
});
