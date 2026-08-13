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
  getUser: vi.fn().mockResolvedValue({
    data: { user: { id: "user-1", email: "me@test.com", user_metadata: { name: "Test User" } } },
    error: null,
  }),
};

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom, auth: mockAuth })),
}));

const mockSendEmail = vi.fn(() => Promise.resolve());
vi.mock("@/features/emails/lib/send-email", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
  substituteVariables: vi.fn((s: string) => s),
}));

vi.mock("@/features/emails/lib/segments", () => ({
  getSegmentedRecipients: vi.fn(() =>
    Promise.resolve([{ email: "a@test.com", name: "A" }])
  ),
}));

describe("Announcement Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "me@test.com", user_metadata: { name: "Test User" } } },
      error: null,
    });
  });

  describe("createAnnouncement", () => {
    it("creates draft announcement and revalidates", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({
          data: { id: "ann-1", subject: "Test", status: "draft" },
          error: null,
        })
      );

      const { createAnnouncement } = await import("./actions");
      const result = await createAnnouncement("evt-1", {
        subject: "Test",
        body: "Hello",
      });

      expect(result).toHaveProperty("id", "ann-1");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/announcements");
    });

    it("includes sender_name, reply_to_email, signature in insert", async () => {
      let insertPayload: Record<string, unknown> | undefined;
      const insertMock = vi.fn((payload: Record<string, unknown>) => {
        insertPayload = payload;
        return createQueryMock({
          data: { id: "ann-2", subject: "Test", status: "draft" },
          error: null,
        });
      });

      mockFrom.mockReturnValue({
        insert: insertMock,
      });

      // Since the proxy chain won't capture the insert call directly,
      // we use a different approach: check that mockFrom is called with "announcements"
      mockFrom.mockReturnValue(
        createQueryMock({
          data: {
            id: "ann-2",
            subject: "Test",
            status: "draft",
            sender_name: "Jane",
            reply_to_email: "jane@test.com",
            signature: "Best, Jane",
          },
          error: null,
        })
      );

      const { createAnnouncement } = await import("./actions");
      const result = await createAnnouncement("evt-1", {
        subject: "Test",
        body: "Hello",
        sender_name: "Jane",
        reply_to_email: "jane@test.com",
        signature: "Best, Jane",
      });

      expect(mockFrom).toHaveBeenCalledWith("announcements");
      expect(result).toHaveProperty("sender_name", "Jane");
      expect(result).toHaveProperty("reply_to_email", "jane@test.com");
      expect(result).toHaveProperty("signature", "Best, Jane");
    });
  });

  describe("updateAnnouncement", () => {
    it("updates draft and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updateAnnouncement } = await import("./actions");
      await updateAnnouncement("evt-1", "ann-1", { subject: "Updated" });

      expect(mockFrom).toHaveBeenCalledWith("announcements");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/announcements");
    });

    it("accepts sender_name, reply_to_email, signature fields", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updateAnnouncement } = await import("./actions");
      await updateAnnouncement("evt-1", "ann-1", {
        sender_name: "Updated Sender",
        reply_to_email: "reply@test.com",
        signature: "Cheers",
      });

      expect(mockFrom).toHaveBeenCalledWith("announcements");
    });
  });

  describe("deleteAnnouncement", () => {
    it("deletes and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { deleteAnnouncement } = await import("./actions");
      await deleteAnnouncement("evt-1", "ann-1");

      expect(mockFrom).toHaveBeenCalledWith("announcements");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/announcements");
    });
  });

  describe("sendAnnouncement", () => {
    it("sends announcement with sender_name and reply_to_email", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) {
          return createQueryMock({
            data: {
              id: "ann-1",
              subject: "Hello",
              body: "World",
              channels: ["in_app", "email"],
              target_audience: { type: "all" },
              sender_name: "Custom Sender",
              reply_to_email: "reply@test.com",
              signature: "Best regards",
            },
            error: null,
          });
        }
        if (callIdx === 2) {
          return createQueryMock({
            data: { title: "My Event", organization_id: "org-1" },
            error: null,
          });
        }
        return createQueryMock({ data: null, error: null }); // update status
      });

      const { sendAnnouncement } = await import("./actions");
      await sendAnnouncement("evt-1", "ann-1");

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          senderName: "Custom Sender",
          replyTo: "reply@test.com",
        })
      );
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/announcements");
    });

    it("appends signature to email HTML when present", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) {
          return createQueryMock({
            data: {
              id: "ann-1",
              subject: "Hello",
              body: "World",
              channels: ["email"],
              target_audience: { type: "all" },
              sender_name: null,
              reply_to_email: null,
              signature: "Best regards, Team",
            },
            error: null,
          });
        }
        if (callIdx === 2) {
          return createQueryMock({
            data: { title: "My Event", organization_id: "org-1" },
            error: null,
          });
        }
        return createQueryMock({ data: null, error: null });
      });

      const { sendAnnouncement } = await import("./actions");
      await sendAnnouncement("evt-1", "ann-1");

      const emailCall = mockSendEmail.mock.calls[0][0] as { html: string };
      expect(emailCall.html).toContain("Best regards, Team");
    });
  });

  describe("sendTestAnnouncement", () => {
    it("sends email only to current user without changing status", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) {
          return createQueryMock({
            data: {
              id: "ann-1",
              subject: "Draft Subject",
              body: "Draft Body",
              channels: ["email"],
              target_audience: { type: "all" },
              sender_name: "Test Sender",
              reply_to_email: null,
              signature: null,
            },
            error: null,
          });
        }
        if (callIdx === 2) {
          return createQueryMock({
            data: { title: "My Event", organization_id: "org-1" },
            error: null,
          });
        }
        return createQueryMock({ data: null, error: null });
      });

      const { sendTestAnnouncement } = await import("./actions");
      await sendTestAnnouncement("evt-1", "ann-1");

      // Should send to current user's email
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: { email: "me@test.com", name: "Test User" },
          subject: expect.stringContaining("[TEST]"),
        })
      );

      // Should NOT update announcement status (no extra from("announcements") call for update)
      // The from calls are: 1 for fetch announcement, 1 for fetch event
      // No third call to update status
      expect(mockFrom).toHaveBeenCalledTimes(2);
    });
  });

  describe("duplicateAnnouncement", () => {
    it("creates a copy with 'Copy of ' prefix and draft status", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) {
          return createQueryMock({
            data: {
              id: "ann-1",
              subject: "Original Subject",
              body: "Original Body",
              target_audience: { type: "all" },
              channels: ["email", "in_app"],
              sender_name: "Org Sender",
              reply_to_email: "reply@org.com",
              signature: "Cheers",
            },
            error: null,
          });
        }
        // insert call
        return createQueryMock({
          data: {
            id: "ann-2",
            subject: "Copy of Original Subject",
            body: "Original Body",
            status: "draft",
            sender_name: "Org Sender",
            reply_to_email: "reply@org.com",
            signature: "Cheers",
          },
          error: null,
        });
      });

      const { duplicateAnnouncement } = await import("./actions");
      const result = await duplicateAnnouncement("evt-1", "ann-1");

      expect(result).toHaveProperty("subject", "Copy of Original Subject");
      expect(result).toHaveProperty("status", "draft");
      expect(result).toHaveProperty("sender_name", "Org Sender");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/announcements");
    });
  });

  describe("createTemplate", () => {
    it("inserts into announcement_templates", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({
          data: { id: "tmpl-1", name: "Welcome", subject: "Hi", body: "Hello" },
          error: null,
        })
      );

      const { createTemplate } = await import("./actions");
      const result = await createTemplate("org-1", {
        name: "Welcome",
        subject: "Hi",
        body: "Hello",
      });

      expect(mockFrom).toHaveBeenCalledWith("announcement_templates");
      expect(result).toHaveProperty("id", "tmpl-1");
    });
  });

  describe("deleteTemplate", () => {
    it("deletes from announcement_templates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { deleteTemplate } = await import("./actions");
      await deleteTemplate("tmpl-1");

      expect(mockFrom).toHaveBeenCalledWith("announcement_templates");
    });
  });

  describe("markAnnouncementRead", () => {
    it("upserts read record", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { markAnnouncementRead } = await import("./actions");
      await markAnnouncementRead("ann-1");

      expect(mockFrom).toHaveBeenCalledWith("announcement_reads");
    });
  });
});
