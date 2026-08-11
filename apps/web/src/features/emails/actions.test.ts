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

vi.mock("./lib/send-email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  substituteVariables: vi.fn((s: string) => s),
}));

vi.mock("./lib/segments", () => ({
  getSegmentedRecipients: vi.fn().mockResolvedValue([
    { email: "a@test.com", name: "Alice" },
    { email: "b@test.com", name: "Bob" },
  ]),
}));

describe("Email Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createEmailTemplate", () => {
    it("creates template and returns it", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: { id: "tpl-1", name: "Welcome" }, error: null })
      );

      const { createEmailTemplate } = await import("./actions");
      const result = await createEmailTemplate({
        organizationId: "org-1",
        name: "Welcome",
        subject: "Hello",
        bodyHtml: "<p>Hi</p>",
        type: "transactional",
      });

      expect(result).toHaveProperty("id", "tpl-1");
      expect(mockFrom).toHaveBeenCalledWith("email_templates");
    });

    it("throws on error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "insert failed" } })
      );

      const { createEmailTemplate } = await import("./actions");
      await expect(
        createEmailTemplate({
          organizationId: "org-1",
          name: "X",
          subject: "X",
          bodyHtml: "X",
          type: "transactional",
        })
      ).rejects.toThrow("insert failed");
    });
  });

  describe("updateEmailTemplate", () => {
    it("updates template", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updateEmailTemplate } = await import("./actions");
      await updateEmailTemplate("tpl-1", { name: "Updated" });

      expect(mockFrom).toHaveBeenCalledWith("email_templates");
    });
  });

  describe("deleteEmailTemplate", () => {
    it("deletes template", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { deleteEmailTemplate } = await import("./actions");
      await deleteEmailTemplate("tpl-1");

      expect(mockFrom).toHaveBeenCalledWith("email_templates");
    });
  });

  describe("createEmailAutomation", () => {
    it("creates automation and revalidates", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({
          data: { id: "auto-1", trigger: "on_registration" },
          error: null,
        })
      );

      const { createEmailAutomation } = await import("./actions");
      const result = await createEmailAutomation({
        eventId: "evt-1",
        trigger: "on_registration",
        templateId: "tpl-1",
      });

      expect(result).toHaveProperty("id", "auto-1");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/emails");
    });
  });

  describe("toggleEmailAutomation", () => {
    it("toggles and revalidates", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) return createQueryMock({ data: { event_id: "evt-1" }, error: null });
        return createQueryMock({ data: null, error: null });
      });

      const { toggleEmailAutomation } = await import("./actions");
      await toggleEmailAutomation("auto-1", false);

      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/emails");
    });
  });

  describe("sendBroadcastEmail", () => {
    it("sends to recipients and returns counts", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({
          data: { id: "evt-1", title: "Test Event", organization_id: "org-1" },
          error: null,
        })
      );

      const { sendBroadcastEmail } = await import("./actions");
      const result = await sendBroadcastEmail({
        eventId: "evt-1",
        subject: "News",
        bodyHtml: "<p>Update</p>",
      });

      expect(result).toHaveProperty("sentCount");
      expect(result).toHaveProperty("totalRecipients", 2);
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/emails");
    });
  });

  describe("Contact List Actions", () => {
    describe("createContactList", () => {
      it("creates a contact list and returns it", async () => {
        mockFrom.mockReturnValue(
          createQueryMock({ data: { id: "cl-1", name: "Newsletter" }, error: null })
        );

        const { createContactList } = await import("./actions");
        const result = await createContactList({
          organizationId: "org-1",
          name: "Newsletter",
        });

        expect(result).toHaveProperty("id", "cl-1");
        expect(mockFrom).toHaveBeenCalledWith("contact_lists");
      });
    });

    describe("deleteContactList", () => {
      it("deletes a contact list", async () => {
        mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

        const { deleteContactList } = await import("./actions");
        await deleteContactList("cl-1");

        expect(mockFrom).toHaveBeenCalledWith("contact_lists");
      });
    });

    describe("uploadContacts", () => {
      it("inserts contacts and returns count", async () => {
        mockFrom.mockReturnValue(
          createQueryMock({ data: [{ id: "c-1" }, { id: "c-2" }], error: null })
        );

        const { uploadContacts } = await import("./actions");
        const result = await uploadContacts("cl-1", [
          { email: "a@test.com", firstName: "Alice", lastName: "A" },
          { email: "b@test.com", firstName: "Bob", lastName: "B" },
        ]);

        expect(result.count).toBe(2);
        expect(mockFrom).toHaveBeenCalledWith("contacts");
      });
    });
  });

  describe("Campaign Actions", () => {
    describe("createCampaign", () => {
      it("creates a draft campaign", async () => {
        mockFrom.mockReturnValue(
          createQueryMock({
            data: { id: "camp-1", status: "draft", subject: "Hello" },
            error: null,
          })
        );

        const { createCampaign } = await import("./actions");
        const result = await createCampaign({
          eventId: "evt-1",
          subject: "Hello",
          bodyHtml: "<p>Hi</p>",
          recipientSource: "registrants",
        });

        expect(result).toHaveProperty("id", "camp-1");
        expect(result).toHaveProperty("status", "draft");
        expect(mockFrom).toHaveBeenCalledWith("email_campaigns");
      });
    });

    describe("updateCampaign", () => {
      it("updates campaign fields", async () => {
        mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

        const { updateCampaign } = await import("./actions");
        await updateCampaign("camp-1", { subject: "Updated" });

        expect(mockFrom).toHaveBeenCalledWith("email_campaigns");
      });
    });

    describe("sendTestEmail", () => {
      it("sends a test email to the given address", async () => {
        mockFrom.mockReturnValue(
          createQueryMock({
            data: {
              id: "evt-1",
              title: "My Event",
              organization_id: "org-1",
              start_date: "2026-09-15",
              slug: "my-event",
              location: "Venue",
              organizations: [{ slug: "my-org" }],
            },
            error: null,
          })
        );

        const { sendTestEmail } = await import("./actions");
        const { sendEmail } = await import("./lib/send-email");

        await sendTestEmail({
          eventId: "evt-1",
          subject: "Test",
          bodyHtml: "<p>Test</p>",
          recipientEmail: "me@test.com",
        });

        expect(sendEmail).toHaveBeenCalled();
      });
    });
  });
});
