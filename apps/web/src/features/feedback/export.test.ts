import { describe, it, expect } from "vitest";
import type { FeedbackQuestion, SessionFeedbackResponse } from "./queries";
import { feedbackToCsv } from "./export";

const questions: FeedbackQuestion[] = [
  { id: "q1", label: "Overall Rating", type: "rating", required: true },
  { id: "q2", label: "Comments", type: "text", required: false },
  { id: "q3", label: "Would Recommend?", type: "multiple_choice", options: ["Yes", "No"], required: true },
];

function makeResponse(overrides: Partial<SessionFeedbackResponse> = {}): SessionFeedbackResponse {
  return {
    id: "r1",
    session_id: "s1",
    user_id: "u1",
    feedback_form_id: "f1",
    answers: { q1: 5, q2: "Great session", q3: "Yes" },
    created_at: "2026-08-10T14:00:00Z",
    ...overrides,
  };
}

describe("feedbackToCsv", () => {
  it("includes header row with User ID, Submitted At, and question labels", () => {
    const csv = feedbackToCsv(questions, []);
    const headerLine = csv.split("\n")[0];
    expect(headerLine).toContain('"User ID"');
    expect(headerLine).toContain('"Submitted At"');
    expect(headerLine).toContain('"Overall Rating"');
    expect(headerLine).toContain('"Comments"');
    expect(headerLine).toContain('"Would Recommend?"');
  });

  it("produces correct data rows with user_id and answers", () => {
    const responses = [makeResponse()];
    const csv = feedbackToCsv(questions, responses);
    const lines = csv.split("\n");

    expect(lines).toHaveLength(2); // header + 1 data row

    const dataRow = lines[1];
    expect(dataRow).toContain('"u1"');
    expect(dataRow).toContain('"5"');
    expect(dataRow).toContain('"Great session"');
    expect(dataRow).toContain('"Yes"');
  });

  it("handles empty responses array (header only)", () => {
    const csv = feedbackToCsv(questions, []);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(1); // only header
  });

  it("handles missing answers gracefully", () => {
    const responses = [makeResponse({ answers: { q1: 4 } })];
    const csv = feedbackToCsv(questions, responses);
    const dataRow = csv.split("\n")[1];

    // q2 and q3 should be empty strings
    expect(dataRow).toContain('"4"');
    // The empty fields are still quoted
    expect(dataRow).toContain('""');
  });

  it("escapes double quotes in values", () => {
    const responses = [
      makeResponse({ answers: { q1: 3, q2: 'She said "excellent"', q3: "No" } }),
    ];
    const csv = feedbackToCsv(questions, responses);
    const dataRow = csv.split("\n")[1];

    // Quotes inside values should be doubled
    expect(dataRow).toContain('"She said ""excellent"""');
  });

  it("handles multiple responses", () => {
    const responses = [
      makeResponse({ user_id: "u1", answers: { q1: 5, q2: "Nice", q3: "Yes" } }),
      makeResponse({ id: "r2", user_id: "u2", answers: { q1: 3, q2: "OK", q3: "No" } }),
    ];
    const csv = feedbackToCsv(questions, responses);
    const lines = csv.split("\n");

    expect(lines).toHaveLength(3); // header + 2 data rows
    expect(lines[1]).toContain('"u1"');
    expect(lines[2]).toContain('"u2"');
  });
});
