import { describe, it, expect } from "vitest";
import type { LivePoll, PollWithResults, AnswerType } from "./queries";

describe("Poll types", () => {
  it("LivePoll includes answer_type field", () => {
    const poll: LivePoll = {
      id: "p1",
      event_id: "e1",
      session_id: null,
      created_by: "u1",
      question: "Rate this",
      options: [],
      status: "draft",
      show_results: false,
      is_anonymous: false,
      prompt_attendee: true,
      result_visibility: "everyone",
      open_time_mode: "now",
      open_before_minutes: 0,
      scheduled_open_at: null,
      sort_order: 0,
      created_at: "",
      updated_at: "",
      answer_type: "star_rating",
    };
    expect(poll.answer_type).toBe("star_rating");
  });

  it("AnswerType includes all 5 types", () => {
    const types: AnswerType[] = [
      "multiple_choice",
      "checkbox",
      "short_answer",
      "star_rating",
      "word_cloud",
    ];
    expect(types).toHaveLength(5);
  });

  it("PollWithResults includes extended result fields", () => {
    const poll: PollWithResults = {
      id: "p1",
      event_id: "e1",
      session_id: null,
      created_by: "u1",
      question: "Rate this",
      options: [],
      status: "open",
      show_results: true,
      is_anonymous: false,
      prompt_attendee: true,
      result_visibility: "everyone",
      open_time_mode: "now",
      open_before_minutes: 0,
      scheduled_open_at: null,
      sort_order: 0,
      created_at: "",
      updated_at: "",
      answer_type: "star_rating",
      vote_counts: {},
      total_votes: 5,
      average_rating: 4.2,
      rating_distribution: { 1: 0, 2: 0, 3: 1, 4: 2, 5: 2 },
    };
    expect(poll.average_rating).toBe(4.2);
    expect(poll.rating_distribution).toBeDefined();
  });
});
