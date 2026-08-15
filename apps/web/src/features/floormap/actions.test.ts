import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function createQueryMock(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === "then")
        return (resolve: (v: unknown) => void) => resolve(result);
      return vi.fn(() => new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

const mockFrom = vi.fn();
const mockStorageFrom = vi.fn();

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: mockFrom,
      storage: {
        from: mockStorageFrom,
      },
    })
  ),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Floormap Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("exports all 5 action functions", async () => {
    const mod = await import("./actions");
    expect(typeof mod.createFloormap).toBe("function");
    expect(typeof mod.updateFloormap).toBe("function");
    expect(typeof mod.deleteFloormap).toBe("function");
    expect(typeof mod.upsertMarker).toBe("function");
    expect(typeof mod.deleteMarker).toBe("function");
  });

  describe("createFloormap", () => {
    it('throws "Image file is required" when no file is provided', async () => {
      const { createFloormap } = await import("./actions");
      const formData = new FormData();
      // no file appended

      await expect(createFloormap("evt-1", formData)).rejects.toThrow(
        "Image file is required"
      );
    });

    it('throws "Image file is required" when file has size 0', async () => {
      const { createFloormap } = await import("./actions");
      const formData = new FormData();
      const emptyFile = new File([], "empty.png", { type: "image/png" });
      formData.set("image", emptyFile);

      await expect(createFloormap("evt-1", formData)).rejects.toThrow(
        "Image file is required"
      );
    });

    it('throws "File must be an image" when file type is wrong', async () => {
      const { createFloormap } = await import("./actions");
      const formData = new FormData();
      const textFile = new File(["hello"], "file.txt", {
        type: "text/plain",
      });
      formData.set("image", textFile);

      await expect(createFloormap("evt-1", formData)).rejects.toThrow(
        "File must be an image"
      );
    });

    it('throws "Image must be under 10MB" when file is too large', async () => {
      const { createFloormap } = await import("./actions");
      const formData = new FormData();
      // Create a buffer just over 10MB
      const bigContent = new Uint8Array(10 * 1024 * 1024 + 1);
      const bigFile = new File([bigContent], "huge.png", {
        type: "image/png",
      });
      formData.set("image", bigFile);

      await expect(createFloormap("evt-1", formData)).rejects.toThrow(
        "Image must be under 10MB"
      );
    });
  });
});
