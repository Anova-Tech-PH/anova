import { describe, it, expect } from "vitest";
import { feedbackTemplates } from "./feedback-templates";

describe("feedbackTemplates", () => {
  it("should have 5 templates", () => {
    expect(feedbackTemplates).toHaveLength(5);
  });

  it("each template should have required fields", () => {
    for (const t of feedbackTemplates) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.questions.length).toBeGreaterThan(0);
    }
  });

  it("each question should have valid type", () => {
    for (const t of feedbackTemplates) {
      for (const q of t.questions) {
        expect(["rating", "multiple_choice", "text"]).toContain(q.type);
        if (q.type === "multiple_choice") {
          expect(q.options).toBeDefined();
          expect(q.options!.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("should have unique template ids", () => {
    const ids = feedbackTemplates.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
