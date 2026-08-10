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
        questions: [{ id: "q1", type: "rating", label: "Rate this" }],
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
        questions: [{ id: "q1", type: "text", label: "Comments" }],
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
});
