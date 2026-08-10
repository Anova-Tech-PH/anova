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
        questions: [{ id: "q1", question: "How was it?", type: "text", required: true }],
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
});
