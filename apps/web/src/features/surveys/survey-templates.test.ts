import { describe, it, expect } from "vitest";
import { surveyTemplates } from "./survey-templates";

describe("surveyTemplates", () => {
  it("should have 12 templates", () => {
    expect(surveyTemplates).toHaveLength(12);
  });

  it("each template should have required fields", () => {
    for (const t of surveyTemplates) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.questions.length).toBeGreaterThan(0);
    }
  });

  it("each question should have valid type", () => {
    for (const t of surveyTemplates) {
      for (const q of t.questions) {
        expect(["rating", "text", "select"]).toContain(q.type);
        if (q.type === "select") {
          expect(q.options).toBeDefined();
          expect(q.options!.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("should have unique template ids", () => {
    const ids = surveyTemplates.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
