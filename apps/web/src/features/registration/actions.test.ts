import { describe, it, expect, vi, beforeEach } from "vitest";
import { revalidatePath } from "next/cache";

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

const mockFrom = vi.fn();
const mockAuth = {
  getUser: vi.fn().mockResolvedValue({
    data: { user: { id: "user-1" } },
    error: null,
  }),
};

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ from: mockFrom, auth: mockAuth })
  ),
}));

vi.mock("@/features/emails/actions", () => ({
  sendRegistrationConfirmationEmail: vi.fn(() => Promise.resolve()),
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "test-qr-code-123"),
}));

describe("Registration Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
  });

  describe("registerForEvent", () => {
    it("registers successfully for published event", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) return createQueryMock({ data: { id: "tt-1", quantity: 100 }, error: null }); // ticket type
        if (callIdx === 2) return createQueryMock({ data: null, error: null, count: 5 }); // count registrations
        if (callIdx === 3) return createQueryMock({ data: null, error: { code: "PGRST116" } }); // no duplicate
        if (callIdx === 4) return createQueryMock({ data: { require_approval: false }, error: null }); // event check
        if (callIdx === 5) return createQueryMock({ data: null, error: null }); // insert registration
        return createQueryMock({ data: { name: "General" }, error: null }); // ticket type name for email
      });

      const { registerForEvent } = await import("./actions");
      const result = await registerForEvent({
        event_id: "evt-1",
        ticket_type_id: "tt-1",
        name: "John Doe",
        email: "john@test.com",
      });

      expect(result).toHaveProperty("qr_code");
      expect(result).toHaveProperty("status", "confirmed");
    });

    it("throws when ticket is sold out", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) return createQueryMock({ data: { id: "tt-1", quantity: 10 }, error: null });
        return createQueryMock({ data: null, error: null, count: 10 }); // full capacity
      });

      const { registerForEvent } = await import("./actions");
      await expect(
        registerForEvent({
          event_id: "evt-1",
          ticket_type_id: "tt-1",
          name: "Jane",
          email: "jane@test.com",
        })
      ).rejects.toThrow("sold out");
    });

    it("throws on duplicate email registration", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) return createQueryMock({ data: { id: "tt-1", quantity: null }, error: null }); // unlimited
        return createQueryMock({ data: { id: "existing-reg" }, error: null }); // duplicate found
      });

      const { registerForEvent } = await import("./actions");
      await expect(
        registerForEvent({
          event_id: "evt-1",
          ticket_type_id: "tt-1",
          name: "John",
          email: "john@test.com",
        })
      ).rejects.toThrow("already registered");
    });
  });

  describe("checkInByQrCode", () => {
    it("checks in successfully", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) {
          // Find registration
          return createQueryMock({
            data: {
              id: "reg-1",
              name: "John",
              email: "john@test.com",
              status: "confirmed",
              checked_in_at: null,
              event_id: "evt-1",
              ticket_type_id: "tt-1",
              ticket_types: { name: "General" },
            },
            error: null,
          });
        }
        if (callIdx === 2) return createQueryMock({ data: null, error: null }); // insert check_in
        return createQueryMock({ data: null, error: null }); // update registration
      });

      const { checkInByQrCode } = await import("./actions");
      const result = await checkInByQrCode("valid-qr", "evt-1", "sess-1");

      expect(result.already_checked_in).toBe(false);
      expect(result.status).toBe("checked_in");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/registrations");
    });

    it("rejects invalid QR code", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "Not found" } })
      );

      const { checkInByQrCode } = await import("./actions");
      await expect(checkInByQrCode("bad-qr", "evt-1", "sess-1")).rejects.toThrow(
        "Registration not found"
      );
    });

    it("throws when not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { checkInByQrCode } = await import("./actions");
      await expect(checkInByQrCode("qr", "evt-1", "sess-1")).rejects.toThrow(
        "Authentication required"
      );
    });
  });

  describe("updateRegistrationStatus", () => {
    it("updates status and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updateRegistrationStatus } = await import("./actions");
      await updateRegistrationStatus("evt-1", "reg-1", "confirmed");

      expect(mockFrom).toHaveBeenCalledWith("registrations");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/registrations");
    });

    it("rejects invalid status", async () => {
      const { updateRegistrationStatus } = await import("./actions");
      await expect(
        updateRegistrationStatus("evt-1", "reg-1", "invalid_status")
      ).rejects.toThrow("Invalid status");
    });
  });
});
