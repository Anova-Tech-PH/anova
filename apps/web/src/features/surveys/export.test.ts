import { describe, it, expect } from "vitest";
import { surveyResponsesToCsv } from "./export";
import type { SurveyQuestion, SurveyResponse } from "./queries";

const questions: SurveyQuestion[] = [
  { id: "q1", label: "How was the event?", type: "rating", required: true },
  { id: "q2", label: "Any comments?", type: "text", required: false },
  { id: "q3", label: "Would you attend again?", type: "select", options: ["Yes", "No"], required: true },
];

const responses: SurveyResponse[] = [
  {
    id: "r1",
    survey_id: "s1",
    registration_id: null,
    respondent_email: "alice@example.com",
    answers: { q1: 5, q2: "Loved it!", q3: "Yes" },
    created_at: "2026-08-01T10:00:00Z",
  },
  {
    id: "r2",
    survey_id: "s1",
    registration_id: null,
    respondent_email: "bob@example.com",
    answers: { q1: 3, q3: "No" },
    created_at: "2026-08-02T14:30:00Z",
  },
];

describe("surveyResponsesToCsv", () => {
  it("includes header row with Email, Submitted At, and question labels", () => {
    const csv = surveyResponsesToCsv(questions, responses);
    const headerLine = csv.split("\n")[0];
    expect(headerLine).toContain('"Email"');
    expect(headerLine).toContain('"Submitted At"');
    expect(headerLine).toContain('"How was the event?"');
    expect(headerLine).toContain('"Any comments?"');
    expect(headerLine).toContain('"Would you attend again?"');
  });

  it("produces correct data rows with email and answers per question", () => {
    const csv = surveyResponsesToCsv(questions, responses);
    const lines = csv.split("\n");
    // First data row (alice)
    expect(lines[1]).toContain('"alice@example.com"');
    expect(lines[1]).toContain('"5"');
    expect(lines[1]).toContain('"Loved it!"');
    expect(lines[1]).toContain('"Yes"');
    // Second data row (bob) - missing q2 answer should be empty
    expect(lines[2]).toContain('"bob@example.com"');
    expect(lines[2]).toContain('"3"');
    expect(lines[2]).toContain('""');
    expect(lines[2]).toContain('"No"');
  });

  it("handles empty responses array", () => {
    const csv = surveyResponsesToCsv(questions, []);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(1); // header only
    expect(lines[0]).toContain('"Email"');
  });

  it("escapes double quotes in values", () => {
    const responsesWithQuotes: SurveyResponse[] = [
      {
        id: "r3",
        survey_id: "s1",
        registration_id: null,
        respondent_email: "charlie@example.com",
        answers: { q1: 4, q2: 'She said "great event"', q3: "Yes" },
        created_at: "2026-08-03T09:00:00Z",
      },
    ];
    const csv = surveyResponsesToCsv(questions, responsesWithQuotes);
    const dataLine = csv.split("\n")[1];
    expect(dataLine).toContain('"She said ""great event"""');
  });
});
