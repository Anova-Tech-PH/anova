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
        if (callIdx === 6) return createQueryMock({ data: null, error: null }); // intent conversion
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

    it("marks matching registration intent as converted after successful registration", async () => {
      const fromCalls: string[] = [];
      let callIdx = 0;
      mockFrom.mockImplementation((table: string) => {
        callIdx++;
        fromCalls.push(table);
        if (callIdx === 1) return createQueryMock({ data: { id: "tt-1", quantity: 100 }, error: null }); // ticket type
        if (callIdx === 2) return createQueryMock({ data: null, error: null, count: 5 }); // count registrations
        if (callIdx === 3) return createQueryMock({ data: null, error: { code: "PGRST116" } }); // no duplicate
        if (callIdx === 4) return createQueryMock({ data: { require_approval: false }, error: null }); // event check
        if (callIdx === 5) return createQueryMock({ data: null, error: null }); // insert registration
        if (callIdx === 6) return createQueryMock({ data: null, error: null }); // intent conversion
        return createQueryMock({ data: { name: "General" }, error: null }); // ticket type name for email
      });

      const { registerForEvent } = await import("./actions");
      await registerForEvent({
        event_id: "evt-1",
        ticket_type_id: "tt-1",
        name: "John Doe",
        email: "JOHN@test.com",
      });

      expect(fromCalls).toContain("registration_intents");
      // The registration_intents call should be the 6th from() call
      expect(fromCalls[5]).toBe("registration_intents");
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

  describe("registerForEvent - auto account creation", () => {
    const mockAdminCreateUser = vi.fn();
    const mockAdminListUsers = vi.fn();
    const mockAdminGenerateLink = vi.fn();
    const mockAdminFrom = vi.fn();

    beforeEach(() => {
      mockAdminCreateUser.mockReset();
      mockAdminListUsers.mockReset();
      mockAdminGenerateLink.mockReset();
      mockAdminFrom.mockReset();

      // Mock dynamic import of @supabase/supabase-js
      vi.doMock("@supabase/supabase-js", () => ({
        createClient: vi.fn(() => ({
          auth: {
            admin: {
              createUser: mockAdminCreateUser,
              listUsers: mockAdminListUsers,
              generateLink: mockAdminGenerateLink,
            },
          },
          from: mockAdminFrom,
        })),
      }));
    });

    function setupSuccessfulRegistration() {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) return createQueryMock({ data: { id: "tt-1", quantity: 100 }, error: null });
        if (callIdx === 2) return createQueryMock({ data: null, error: null, count: 5 });
        if (callIdx === 3) return createQueryMock({ data: null, error: { code: "PGRST116" } });
        if (callIdx === 4) return createQueryMock({ data: { require_approval: false }, error: null });
        if (callIdx === 5) return createQueryMock({ data: null, error: null });
        if (callIdx === 6) return createQueryMock({ data: null, error: null });
        return createQueryMock({ data: { name: "General" }, error: null });
      });
    }

    it("creates auth user and attendee profile on successful registration", async () => {
      setupSuccessfulRegistration();

      mockAdminCreateUser.mockResolvedValue({
        data: { user: { id: "new-user-123" } },
        error: null,
      });
      mockAdminFrom.mockReturnValue(createQueryMock({ data: null, error: null }));
      mockAdminGenerateLink.mockResolvedValue({ data: {}, error: null });

      // Reset module cache so fresh import picks up new mocks
      vi.resetModules();
      const { registerForEvent } = await import("./actions");
      const result = await registerForEvent({
        event_id: "evt-1",
        ticket_type_id: "tt-1",
        name: "John Doe",
        email: "john@test.com",
        custom_fields: { company: "Acme Corp", title: "Engineer" },
      });

      expect(result).toHaveProperty("status", "confirmed");

      // Wait for async auto-account creation to settle
      await new Promise((r) => setTimeout(r, 50));

      expect(mockAdminCreateUser).toHaveBeenCalledWith({
        email: "john@test.com",
        email_confirm: true,
        user_metadata: { display_name: "John Doe" },
      });

      // Should upsert attendee_profiles
      expect(mockAdminFrom).toHaveBeenCalledWith("attendee_profiles");

      // Should update registration user_id
      expect(mockAdminFrom).toHaveBeenCalledWith("registrations");
    });

    it("links existing user if email already has account", async () => {
      setupSuccessfulRegistration();

      mockAdminCreateUser.mockResolvedValue({
        data: { user: null },
        error: { message: "User already been registered" },
      });
      mockAdminListUsers.mockResolvedValue({
        data: { users: [{ id: "existing-user-456", email: "jane@test.com" }] },
        error: null,
      });
      mockAdminFrom.mockReturnValue(createQueryMock({ data: null, error: null }));
      mockAdminGenerateLink.mockResolvedValue({ data: {}, error: null });

      vi.resetModules();
      const { registerForEvent } = await import("./actions");
      const result = await registerForEvent({
        event_id: "evt-1",
        ticket_type_id: "tt-1",
        name: "Jane Doe",
        email: "jane@test.com",
      });

      expect(result).toHaveProperty("status", "confirmed");

      await new Promise((r) => setTimeout(r, 50));

      expect(mockAdminListUsers).toHaveBeenCalled();
      expect(mockAdminFrom).toHaveBeenCalledWith("registrations");
    });

    it("completes registration even if account creation fails", async () => {
      setupSuccessfulRegistration();

      mockAdminCreateUser.mockRejectedValue(new Error("Service unavailable"));

      vi.resetModules();
      const { registerForEvent } = await import("./actions");
      const result = await registerForEvent({
        event_id: "evt-1",
        ticket_type_id: "tt-1",
        name: "Bob",
        email: "bob@test.com",
      });

      // Registration should still succeed
      expect(result).toHaveProperty("status", "confirmed");
      expect(result).toHaveProperty("qr_code");

      await new Promise((r) => setTimeout(r, 50));
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
