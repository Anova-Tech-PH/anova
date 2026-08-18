import type { SupabaseClient } from "@supabase/supabase-js";

export async function getSessionsWithQA(
  client: SupabaseClient,
  eventId: string,
  options?: { search?: string }
) {
  let query = client
    .from("sessions")
    .select("id, title, start_time, end_time, session_questions(count)")
    .eq("event_id", eventId)
    .order("start_time");

  if (options?.search) {
    query = query.ilike("title", `%${options.search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map(
    (s: {
      id: string;
      title: string;
      start_time: string;
      end_time: string;
      session_questions: { count: number }[];
    }) => ({
      id: s.id,
      title: s.title,
      start_time: s.start_time,
      end_time: s.end_time,
      question_count: s.session_questions?.[0]?.count ?? 0,
    })
  );
}

export async function getSessionQuestions(
  client: SupabaseClient,
  sessionId: string,
  userId?: string
) {
  const { data, error } = await client
    .from("session_questions")
    .select(
      "id, session_id, event_id, user_id, question_text, status, is_anonymous, upvote_count, answer_text, created_at"
    )
    .eq("session_id", sessionId)
    .in("status", ["approved", "answered"])
    .order("upvote_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  let upvotedIds = new Set<string>();
  if (userId) {
    const { data: upvotes } = await client
      .from("question_upvotes")
      .select("question_id")
      .eq("user_id", userId);
    upvotedIds = new Set(
      (upvotes ?? []).map((u: { question_id: string }) => u.question_id)
    );
  }

  return (data ?? []).map((q: { id: string }) => ({
    ...q,
    is_upvoted: upvotedIds.has(q.id),
  }));
}
