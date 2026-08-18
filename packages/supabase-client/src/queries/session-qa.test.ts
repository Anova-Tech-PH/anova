import { describe, it, expect } from "vitest";
import { getSessionsWithQA, getSessionQuestions } from "./session-qa";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createMockSupabaseClient, createMockSupabaseClientMultiTable } from "../test-helpers";

describe("getSessionsWithQA", () => {
  it("returns sessions with question count", async () => {
    const sessions = [
      { id: "s1", title: "Talk", start_time: "09:00", end_time: "10:00", session_questions: [{ count: 3 }] },
    ];
    const client = createMockSupabaseClient({ data: sessions }) as unknown as SupabaseClient;
    const result = await getSessionsWithQA(client, "event-1");
    expect(result).toHaveLength(1);
    expect(result[0].question_count).toBe(3);
    expect(client.from).toHaveBeenCalledWith("sessions");
  });

  it("throws on error", async () => {
    const client = createMockSupabaseClient({ error: { message: "fail" } }) as unknown as SupabaseClient;
    await expect(getSessionsWithQA(client, "event-1")).rejects.toThrow("fail");
  });
});

describe("getSessionQuestions", () => {
  it("returns questions with upvote status", async () => {
    const questions = [{ id: "q1", question_text: "How?", upvote_count: 5 }];
    const client = createMockSupabaseClientMultiTable({
      session_questions: { data: questions },
      question_upvotes: { data: [] },
    }) as unknown as SupabaseClient;

    const result = await getSessionQuestions(client, "s1");
    expect(result).toHaveLength(1);
    expect(result[0].is_upvoted).toBe(false);
    expect(client.from).toHaveBeenCalledWith("session_questions");
  });

  it("marks upvoted questions for authenticated user", async () => {
    const questions = [{ id: "q1", question_text: "How?", upvote_count: 5 }];
    const client = createMockSupabaseClientMultiTable({
      session_questions: { data: questions },
      question_upvotes: { data: [{ question_id: "q1" }] },
    }) as unknown as SupabaseClient;

    const result = await getSessionQuestions(client, "s1", "user-1");
    expect(result[0].is_upvoted).toBe(true);
  });
});
