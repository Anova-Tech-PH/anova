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

vi.mock("@/features/emails/lib/send-email", () => ({
  sendEmail: vi.fn(() => Promise.resolve()),
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
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
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
  });

  describe("updateAnnouncement", () => {
    it("updates draft and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updateAnnouncement } = await import("./actions");
      await updateAnnouncement("evt-1", "ann-1", { subject: "Updated" });

      expect(mockFrom).toHaveBeenCalledWith("announcements");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/announcements");
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
    it("sends announcement and marks as sent", async () => {
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

      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/announcements");
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
