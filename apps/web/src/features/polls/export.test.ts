import { describe, it, expect } from "vitest";
import { pollsToCsv } from "./export";
import type { PollWithResults } from "./queries";

function makePoll(overrides: Partial<PollWithResults> = {}): PollWithResults {
  return {
    id: "poll-1",
    event_id: "evt-1",
    session_id: null,
    created_by: "user-1",
    question: "Favorite color?",
    answer_type: "multiple_choice",
    options: [
      { id: "opt-a", text: "Red" },
      { id: "opt-b", text: "Blue" },
    ],
    status: "closed",
    show_results: true,
    is_anonymous: false,
    prompt_attendee: false,
    result_visibility: "everyone",
    open_time_mode: "now",
    open_before_minutes: 0,
    scheduled_open_at: null,
    sort_order: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    vote_counts: { "opt-a": 3, "opt-b": 7 },
    total_votes: 10,
    session_title: "Opening Keynote",
    ...overrides,
  };
}

describe("pollsToCsv", () => {
  it("formats header row correctly", () => {
    const csv = pollsToCsv([]);
    const header = csv.split("\n")[0];
    expect(header).toBe(
      '"Question","Option","Votes","Percentage","Status","Session"'
    );
  });

  it("formats poll data with correct percentages", () => {
    const poll = makePoll();
    const csv = pollsToCsv([poll]);
    const lines = csv.split("\n");

    expect(lines).toHaveLength(3); // header + 2 options
    expect(lines[1]).toBe(
      '"Favorite color?","Red","3","30.0%","closed","Opening Keynote"'
    );
    expect(lines[2]).toBe(
      '"Favorite color?","Blue","7","70.0%","closed","Opening Keynote"'
    );
  });

  it("handles empty polls array", () => {
    const csv = pollsToCsv([]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(1); // header only
  });

  it("escapes quotes in question and option text", () => {
    const poll = makePoll({
      question: 'Do you like "JavaScript"?',
      options: [
        { id: "opt-a", text: 'Yes, I "love" it' },
        { id: "opt-b", text: "No" },
      ],
      vote_counts: { "opt-a": 1, "opt-b": 0 },
      total_votes: 1,
    });
    const csv = pollsToCsv([poll]);
    const lines = csv.split("\n");

    expect(lines[1]).toBe(
      '"Do you like ""JavaScript""?","Yes, I ""love"" it","1","100.0%","closed","Opening Keynote"'
    );
    expect(lines[2]).toBe(
      '"Do you like ""JavaScript""?","No","0","0.0%","closed","Opening Keynote"'
    );
  });

  it("handles polls with zero votes", () => {
    const poll = makePoll({
      vote_counts: {},
      total_votes: 0,
    });
    const csv = pollsToCsv([poll]);
    const lines = csv.split("\n");

    expect(lines[1]).toContain('"0"');
    expect(lines[1]).toContain('"0.0%"');
  });

  it("handles polls with no session", () => {
    const poll = makePoll({ session_title: undefined });
    const csv = pollsToCsv([poll]);
    const lines = csv.split("\n");

    // Last field should be empty string
    expect(lines[1]).toMatch(/,""$/);
  });

  it("formats star rating poll with distribution", () => {
    const poll = makePoll({
      answer_type: "star_rating",
      question: "Rate the session",
      options: [],
      vote_counts: {},
      total_votes: 3,
      average_rating: 4.3,
      rating_distribution: { 1: 0, 2: 0, 3: 1, 4: 1, 5: 1 },
    });
    const csv = pollsToCsv([poll]);
    const lines = csv.split("\n");

    // Header + 5 rating rows
    expect(lines).toHaveLength(6);
    expect(lines[1]).toContain('"1 star"');
    expect(lines[5]).toContain('"5 stars"');
  });

  it("formats short answer poll with text responses", () => {
    const poll = makePoll({
      answer_type: "short_answer",
      question: "Any feedback?",
      options: [],
      vote_counts: {},
      total_votes: 2,
      text_responses: ["Great talk!", "Needs more examples"],
    });
    const csv = pollsToCsv([poll]);
    const lines = csv.split("\n");

    expect(lines).toHaveLength(3); // header + 2 responses
    expect(lines[1]).toContain('"Great talk!"');
    expect(lines[2]).toContain('"Needs more examples"');
  });

  it("formats word cloud poll with frequencies", () => {
    const poll = makePoll({
      answer_type: "word_cloud",
      question: "One word to describe this?",
      options: [],
      vote_counts: {},
      total_votes: 5,
      word_frequencies: { "amazing": 3, "inspiring": 2 },
    });
    const csv = pollsToCsv([poll]);
    const lines = csv.split("\n");

    expect(lines).toHaveLength(3); // header + 2 words
    expect(lines[1]).toContain('"amazing"');
    expect(lines[1]).toContain('"3"');
  });
});
