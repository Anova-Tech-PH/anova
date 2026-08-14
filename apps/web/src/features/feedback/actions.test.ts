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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSendEmail = vi.fn((..._args: any[]) => Promise.resolve({ id: "resend-1" }));
vi.mock("@/features/emails/lib/send-email", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(args[0]),
}));

vi.mock("@/features/gamification/award", () => ({
  tryAwardPoints: vi.fn(),
}));

describe("Feedback Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  describe("createFeedbackForm", () => {
    it("creates form with questions", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({
          data: { id: "form-1", name: "Session Feedback", questions: [] },
          error: null,
        })
      );

      const { createFeedbackForm } = await import("./actions");
      const result = await createFeedbackForm("evt-1", {
        name: "Session Feedback",
        questions: [{ id: "q1", type: "rating", label: "Rate this", required: true }],
      });

      expect(result).toHaveProperty("id", "form-1");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/feedback");
    });
  });

  describe("updateFeedbackForm", () => {
    it("updates form and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updateFeedbackForm } = await import("./actions");
      await updateFeedbackForm("evt-1", "form-1", {
        questions: [{ id: "q1", type: "text", label: "Comments", required: false }],
      });

      expect(mockFrom).toHaveBeenCalledWith("feedback_forms");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/feedback");
    });
  });

  describe("deleteFeedbackForm", () => {
    it("deletes form and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { deleteFeedbackForm } = await import("./actions");
      await deleteFeedbackForm("evt-1", "form-1");

      expect(mockFrom).toHaveBeenCalledWith("feedback_forms");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/feedback");
    });
  });

  describe("assignFeedbackForm", () => {
    it("links form to session and revalidates both paths", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { assignFeedbackForm } = await import("./actions");
      await assignFeedbackForm("evt-1", "sess-1", "form-1");

      expect(mockFrom).toHaveBeenCalledWith("sessions");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/feedback");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/schedule");
    });
  });

  describe("submitSessionFeedback", () => {
    it("submits feedback successfully", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { submitSessionFeedback } = await import("./actions");
      await submitSessionFeedback("sess-1", "form-1", { q1: 5 });

      expect(mockFrom).toHaveBeenCalledWith("session_feedback");
    });

    it("throws on duplicate submission", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { code: "23505", message: "duplicate" } })
      );

      const { submitSessionFeedback } = await import("./actions");
      await expect(
        submitSessionFeedback("sess-1", "form-1", { q1: 3 })
      ).rejects.toThrow("already submitted feedback");
    });
  });

  describe("shareFeedbackWithSpeakers", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockSendEmail.mockResolvedValue({ id: "resend-1" });
    });

    it("sends email to each speaker with feedback stats", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "session_speakers") {
          return createQueryMock({
            data: [
              { speakers: { name: "Alice", email: "alice@test.com" } },
              { speakers: { name: "Bob", email: "bob@test.com" } },
            ],
            error: null,
          });
        }
        if (table === "events") {
          return createQueryMock({
            data: { title: "My Event", organization_id: "org-1" },
            error: null,
          });
        }
        if (table === "session_feedback") {
          return createQueryMock({
            data: [
              { id: "r1", session_id: "s1", user_id: "u1", feedback_form_id: "f1", answers: { q1: 4, q2: "Great" }, created_at: "2026-01-01" },
              { id: "r2", session_id: "s1", user_id: "u2", feedback_form_id: "f1", answers: { q1: 5, q2: "Good" }, created_at: "2026-01-02" },
            ],
            error: null,
          });
        }
        if (table === "feedback_forms") {
          return createQueryMock({
            data: {
              id: "f1",
              questions: [
                { id: "q1", label: "Overall Rating", type: "rating", required: true },
                { id: "q2", label: "Comments", type: "text", required: false },
              ],
            },
            error: null,
          });
        }
        if (table === "sessions") {
          return createQueryMock({
            data: { feedback_form_id: "f1" },
            error: null,
          });
        }
        return createQueryMock({ data: null, error: null });
      });

      const { shareFeedbackWithSpeakers } = await import("./actions");
      const result = await shareFeedbackWithSpeakers("evt-1", "s1", "Intro Talk");

      expect(result.emailsSent).toBe(2);
      expect(mockSendEmail).toHaveBeenCalledTimes(2);
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: { email: "alice@test.com", name: "Alice" },
          subject: expect.stringContaining("Intro Talk"),
        })
      );
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: { email: "bob@test.com", name: "Bob" },
        })
      );
    });

    it("returns 0 emails sent when session has no speakers", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "session_speakers") {
          return createQueryMock({ data: [], error: null });
        }
        return createQueryMock({ data: null, error: null });
      });

      const { shareFeedbackWithSpeakers } = await import("./actions");
      const result = await shareFeedbackWithSpeakers("evt-1", "s1", "Intro Talk");

      expect(result.emailsSent).toBe(0);
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("sends email with zero-feedback summary when no responses exist", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "session_speakers") {
          return createQueryMock({
            data: [{ speakers: { name: "Alice", email: "alice@test.com" } }],
            error: null,
          });
        }
        if (table === "events") {
          return createQueryMock({
            data: { title: "My Event", organization_id: "org-1" },
            error: null,
          });
        }
        if (table === "session_feedback") {
          return createQueryMock({ data: [], error: null });
        }
        if (table === "feedback_forms") {
          return createQueryMock({
            data: {
              id: "f1",
              questions: [
                { id: "q1", label: "Rating", type: "rating", required: true },
              ],
            },
            error: null,
          });
        }
        if (table === "sessions") {
          return createQueryMock({
            data: { feedback_form_id: "f1" },
            error: null,
          });
        }
        return createQueryMock({ data: null, error: null });
      });

      const { shareFeedbackWithSpeakers } = await import("./actions");
      const result = await shareFeedbackWithSpeakers("evt-1", "s1", "Intro Talk");

      expect(result.emailsSent).toBe(1);
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      const emailArg = (mockSendEmail.mock.calls as unknown as Array<[{ html: string }]>)[0][0];
      expect(emailArg.html).toContain("0 responses");
    });
  });
});
