import { describe, it, expect, vi, beforeEach } from "vitest";
import { revalidatePath } from "next/cache";

let capturedInsert: Record<string, unknown> | undefined;
let capturedUpdate: Record<string, unknown> | undefined;

function createQueryMock(result: { data?: unknown; error?: unknown; count?: number | null }) {
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

function createMutationMock(result?: { data?: unknown; error?: unknown }) {
  const res = result ?? { data: { id: "new-id", event_id: "e1" }, error: null };
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === "then") return (resolve: (v: unknown) => void) => resolve(res);
      if (prop === "insert") {
        return (payload: Record<string, unknown>) => {
          capturedInsert = payload;
          return new Proxy({}, handler);
        };
      }
      if (prop === "update") {
        return (payload: Record<string, unknown>) => {
          capturedUpdate = payload;
          return new Proxy({}, handler);
        };
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

describe("Ticket Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedInsert = undefined;
    capturedUpdate = undefined;
  });

  describe("createTicketType", () => {
    it("creates ticket type with sort order", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) return createQueryMock({ data: [{ sort_order: 1 }], error: null });
        return createQueryMock({
          data: { id: "tt-1", name: "General", price: 0, sort_order: 2 },
          error: null,
        });
      });

      const { createTicketType } = await import("./actions");
      const result = await createTicketType("evt-1", {
        name: "General",
        type: "free",
        price: 0,
      });

      expect(result).toHaveProperty("id", "tt-1");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/tickets");
    });

    it("creates paid ticket", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) return createQueryMock({ data: [], error: null });
        return createQueryMock({
          data: { id: "tt-2", name: "VIP", price: 99, sort_order: 0 },
          error: null,
        });
      });

      const { createTicketType } = await import("./actions");
      const result = await createTicketType("evt-1", {
        name: "VIP",
        type: "paid",
        price: 99,
        quantity: 50,
      });

      expect(result).toHaveProperty("name", "VIP");
    });
  });

  describe("updateTicketType", () => {
    it("updates ticket and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updateTicketType } = await import("./actions");
      await updateTicketType("evt-1", "tt-1", { price: 25, quantity: 200 });

      expect(mockFrom).toHaveBeenCalledWith("ticket_types");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/tickets");
    });
  });

  describe("deleteTicketType", () => {
    it("blocks deletion when registrations exist", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: null, count: 5 })
      );

      const { deleteTicketType } = await import("./actions");
      await expect(deleteTicketType("evt-1", "tt-1")).rejects.toThrow(
        "Cannot delete"
      );
    });

    it("deletes when no registrations", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) return createQueryMock({ data: null, error: null, count: 0 });
        return createQueryMock({ data: null, error: null });
      });

      const { deleteTicketType } = await import("./actions");
      await deleteTicketType("evt-1", "tt-1");

      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/tickets");
    });
  });

  describe("createTicketType access_code", () => {
    it("uppercases and trims access_code", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) return createQueryMock({ data: [], error: null });
        return createMutationMock();
      });

      const { createTicketType } = await import("./actions");
      await createTicketType("evt-1", {
        name: "VIP",
        type: "paid",
        price: 100,
        access_code: "  hello world  ",
      });

      expect(capturedInsert).toBeDefined();
      expect(capturedInsert!.access_code).toBe("HELLO WORLD");
    });

    it("sets access_code to null when empty string provided", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) return createQueryMock({ data: [], error: null });
        return createMutationMock();
      });

      const { createTicketType } = await import("./actions");
      await createTicketType("evt-1", {
        name: "General",
        type: "free",
        price: 0,
        access_code: "",
      });

      expect(capturedInsert).toBeDefined();
      expect(capturedInsert!.access_code).toBeNull();
    });
  });

  describe("updateTicketType access_code", () => {
    it("uppercases and trims access_code on update", async () => {
      mockFrom.mockImplementation(() => createMutationMock());

      const { updateTicketType } = await import("./actions");
      await updateTicketType("evt-1", "tt-1", {
        access_code: "  secret  ",
      });

      expect(capturedUpdate).toBeDefined();
      expect(capturedUpdate!.access_code).toBe("SECRET");
    });

    it("sets access_code to null when empty string on update", async () => {
      mockFrom.mockImplementation(() => createMutationMock());

      const { updateTicketType } = await import("./actions");
      await updateTicketType("evt-1", "tt-1", {
        access_code: "",
      });

      expect(capturedUpdate).toBeDefined();
      expect(capturedUpdate!.access_code).toBeNull();
    });
  });
});
