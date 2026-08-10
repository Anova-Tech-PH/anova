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

describe("Promo Code Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createPromoCode", () => {
    it("creates and returns promo code", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: { id: "pc-1", code: "SAVE10" }, error: null })
      );

      const { createPromoCode } = await import("./actions");
      const result = await createPromoCode("evt-1", {
        code: "save10",
        discount_type: "percentage",
        discount_value: 10,
      });

      expect(result).toHaveProperty("code", "SAVE10");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/promo-codes");
    });

    it("throws on duplicate code", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { code: "23505", message: "duplicate" } })
      );

      const { createPromoCode } = await import("./actions");
      await expect(
        createPromoCode("evt-1", { code: "DUP", discount_type: "percentage", discount_value: 10 })
      ).rejects.toThrow("already exists");
    });
  });

  describe("updatePromoCode", () => {
    it("updates and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updatePromoCode } = await import("./actions");
      await updatePromoCode("evt-1", "pc-1", { discount_value: 20 });

      expect(mockFrom).toHaveBeenCalledWith("promo_codes");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/promo-codes");
    });
  });

  describe("deletePromoCode", () => {
    it("deletes and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { deletePromoCode } = await import("./actions");
      await deletePromoCode("evt-1", "pc-1");

      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/promo-codes");
    });
  });

  describe("validatePromoCode", () => {
    it("validates active code", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({
          data: {
            id: "pc-1",
            active: true,
            discount_type: "percentage",
            discount_value: 10,
            starts_at: null,
            expires_at: null,
            max_uses: null,
            current_uses: 0,
            applies_to: [],
          },
          error: null,
        })
      );

      const { validatePromoCode } = await import("./actions");
      const result = await validatePromoCode("evt-1", "SAVE10");

      expect(result).toEqual({
        id: "pc-1",
        discount_type: "percentage",
        discount_value: 10,
      });
    });

    it("rejects inactive code", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({
          data: { id: "pc-1", active: false, discount_type: "percentage", discount_value: 10 },
          error: null,
        })
      );

      const { validatePromoCode } = await import("./actions");
      await expect(validatePromoCode("evt-1", "DEAD")).rejects.toThrow("no longer active");
    });

    it("rejects expired code", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({
          data: {
            id: "pc-1",
            active: true,
            discount_type: "percentage",
            discount_value: 10,
            starts_at: null,
            expires_at: "2020-01-01T00:00:00Z",
            max_uses: null,
            current_uses: 0,
            applies_to: [],
          },
          error: null,
        })
      );

      const { validatePromoCode } = await import("./actions");
      await expect(validatePromoCode("evt-1", "OLD")).rejects.toThrow("expired");
    });

    it("rejects code at usage limit", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({
          data: {
            id: "pc-1",
            active: true,
            discount_type: "percentage",
            discount_value: 10,
            starts_at: null,
            expires_at: null,
            max_uses: 5,
            current_uses: 5,
            applies_to: [],
          },
          error: null,
        })
      );

      const { validatePromoCode } = await import("./actions");
      await expect(validatePromoCode("evt-1", "MAXED")).rejects.toThrow("usage limit");
    });
  });
});
