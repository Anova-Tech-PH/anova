import { describe, it, expect, vi, beforeEach } from "vitest";
import { revalidatePath } from "next/cache";

function createQueryMock(result: { data?: unknown; error?: unknown }) {
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === "then") return (resolve: (v: unknown) => void) => resolve(result);
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

describe("Custom Field Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createCustomField", () => {
    it("creates field with auto sort order", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) return createQueryMock({ data: [{ sort_order: 2 }], error: null });
        return createQueryMock({
          data: { id: "cf-1", label: "Company", sort_order: 3 },
          error: null,
        });
      });

      const { createCustomField } = await import("./actions");
      const result = await createCustomField("evt-1", {
        label: "Company",
        field_key: "company",
        type: "text",
      });

      expect(result).toHaveProperty("id", "cf-1");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1");
    });
  });

  describe("updateCustomField", () => {
    it("updates and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updateCustomField } = await import("./actions");
      await updateCustomField("evt-1", "cf-1", { label: "Updated" });

      expect(mockFrom).toHaveBeenCalledWith("custom_registration_fields");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1");
    });
  });

  describe("deleteCustomField", () => {
    it("deletes and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { deleteCustomField } = await import("./actions");
      await deleteCustomField("evt-1", "cf-1");

      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1");
    });
  });
});
