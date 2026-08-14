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
});
