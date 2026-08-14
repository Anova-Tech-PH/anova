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

describe("Survey Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createOrUpdateSurvey", () => {
    it("creates new survey when none exists", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) return createQueryMock({ data: null, error: { code: "PGRST116" } });
        return createQueryMock({ data: null, error: null });
      });

      const { createOrUpdateSurvey } = await import("./actions");
      await createOrUpdateSurvey("evt-1", {
        title: "Feedback",
        questions: [{ id: "q1", label: "How was it?", type: "text", required: true }],
      });

      expect(mockFrom).toHaveBeenCalledWith("surveys");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/survey");
    });

    it("updates existing survey", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) return createQueryMock({ data: { id: "survey-1" }, error: null });
        return createQueryMock({ data: null, error: null });
      });

      const { createOrUpdateSurvey } = await import("./actions");
      await createOrUpdateSurvey("evt-1", {
        title: "Updated",
        questions: [],
      });

      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/survey");
    });
  });

  describe("submitSurveyResponse", () => {
    it("submits response successfully", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1)
          return createQueryMock({ data: null, error: { code: "PGRST116" } });
        return createQueryMock({ data: null, error: null });
      });

      const { submitSurveyResponse } = await import("./actions");
      await submitSurveyResponse("survey-1", "user@test.com", { q1: "Great" });

      expect(mockFrom).toHaveBeenCalledWith("survey_responses");
    });

    it("rejects duplicate response", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: { id: "resp-1" }, error: null })
      );

      const { submitSurveyResponse } = await import("./actions");
      await expect(
        submitSurveyResponse("survey-1", "user@test.com", { q1: "Great" })
      ).rejects.toThrow("already submitted");
    });
  });

  describe("toggleSurveyActive", () => {
    it("toggles and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { toggleSurveyActive } = await import("./actions");
      await toggleSurveyActive("evt-1", "survey-1", false);

      expect(mockFrom).toHaveBeenCalledWith("surveys");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/survey");
    });
  });

  describe("createSurvey", () => {
    it("inserts a new survey with status draft", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: { id: "survey-new" }, error: null }));

      const { createSurvey } = await import("./actions");
      await createSurvey("evt-1", {
        title: "Feedback Survey",
        description: "Please give feedback",
        questions: [{ id: "q1", label: "How was it?", type: "rating", required: true }],
      });

      expect(mockFrom).toHaveBeenCalledWith("surveys");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/survey");
    });

    it("throws on supabase error", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: { message: "DB error" } }));

      const { createSurvey } = await import("./actions");
      await expect(
        createSurvey("evt-1", { title: "Test", questions: [] })
      ).rejects.toThrow("DB error");
    });
  });

  describe("updateSurvey", () => {
    it("updates an existing survey", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: {}, error: null }));

      const { updateSurvey } = await import("./actions");
      await updateSurvey("evt-1", "survey-1", {
        title: "Updated Title",
        description: "Updated desc",
      });

      expect(mockFrom).toHaveBeenCalledWith("surveys");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/survey");
    });

    it("throws on supabase error", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: { message: "Not found" } }));

      const { updateSurvey } = await import("./actions");
      await expect(
        updateSurvey("evt-1", "survey-1", { title: "X" })
      ).rejects.toThrow("Not found");
    });
  });

  describe("deleteSurvey", () => {
    it("deletes a survey by id", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: {}, error: null }));

      const { deleteSurvey } = await import("./actions");
      await deleteSurvey("evt-1", "survey-1");

      expect(mockFrom).toHaveBeenCalledWith("surveys");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/survey");
    });

    it("throws on supabase error", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: { message: "Delete failed" } }));

      const { deleteSurvey } = await import("./actions");
      await expect(deleteSurvey("evt-1", "survey-1")).rejects.toThrow("Delete failed");
    });
  });

  describe("toggleSurveyStatus", () => {
    it("updates status to the given value", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: {}, error: null }));

      const { toggleSurveyStatus } = await import("./actions");
      await toggleSurveyStatus("evt-1", "survey-1", "closed");

      expect(mockFrom).toHaveBeenCalledWith("surveys");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/survey");
    });

    it("throws on supabase error", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: { message: "Status error" } }));

      const { toggleSurveyStatus } = await import("./actions");
      await expect(
        toggleSurveyStatus("evt-1", "survey-1", "active")
      ).rejects.toThrow("Status error");
    });
  });

  describe("duplicateSurvey", () => {
    it("creates a copy with '(copy)' suffix and draft status", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: { id: "survey-dup" }, error: null }));

      const { duplicateSurvey } = await import("./actions");
      const sourceQuestions = [
        { id: "q1", label: "Rate us", type: "rating" as const, required: true },
        { id: "q2", label: "Comments", type: "text" as const, required: false },
      ];

      await duplicateSurvey("evt-1", "My Survey", sourceQuestions);

      expect(mockFrom).toHaveBeenCalledWith("surveys");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/survey");
    });

    it("generates new UUIDs for each question", async () => {
      // Track the insert payload
      let insertPayload: Record<string, unknown> | null = null;
      mockFrom.mockImplementation(() => ({
        insert: vi.fn((payload: Record<string, unknown>) => {
          insertPayload = payload;
          return Promise.resolve({ data: { id: "survey-dup" }, error: null });
        }),
      }));

      const { duplicateSurvey } = await import("./actions");
      const sourceQuestions = [
        { id: "original-id-1", label: "Rate us", type: "rating" as const, required: true },
        { id: "original-id-2", label: "Comments", type: "text" as const, required: false },
      ];

      await duplicateSurvey("evt-1", "Old Survey", sourceQuestions);

      expect(insertPayload).not.toBeNull();
      const inserted = insertPayload as Record<string, unknown>;
      expect(inserted.title).toBe("Old Survey (copy)");
      expect(inserted.status).toBe("draft");

      const newQuestions = inserted.questions as Array<{ id: string; label: string }>;
      expect(newQuestions).toHaveLength(2);
      expect(newQuestions[0].id).not.toBe("original-id-1");
      expect(newQuestions[1].id).not.toBe("original-id-2");
      // Labels should be preserved
      expect(newQuestions[0].label).toBe("Rate us");
      expect(newQuestions[1].label).toBe("Comments");
    });

    it("throws on supabase error", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: { message: "Insert failed" } }));

      const { duplicateSurvey } = await import("./actions");
      await expect(
        duplicateSurvey("evt-1", "Test", [])
      ).rejects.toThrow("Insert failed");
    });
  });
});
