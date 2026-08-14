import { createClient } from "@attendly/ui/supabase/server";

export type AttendeeQuestion = {
  id: string;
  session_id: string;
  event_id: string;
  user_id: string | null;
  question_text: string;
  status: "pending" | "approved" | "answered" | "rejected";
  is_anonymous: boolean;
  upvote_count: number;
  answer_text: string | null;
  created_at: string;
  is_upvoted: boolean;
};

export async function getSessionsWithQA(
  eventId: string,
  options: {
    search?: string;
    bookmarkedSessionIds?: string[];
  } = {}
) {
  const supabase = await createClient();

  let query = supabase
    .from("sessions")
    .select("id, title, start_time, end_time, session_questions(count)")
    .eq("event_id", eventId)
    .order("start_time");

  if (options.search) {
    query = query.ilike("title", `%${options.search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const sessions = (data ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    start_time: s.start_time,
    end_time: s.end_time,
    question_count:
      (s.session_questions as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));

  const bookmarkedSet = new Set(options.bookmarkedSessionIds ?? []);
  return {
    myAgenda: sessions.filter((s) => bookmarkedSet.has(s.id)),
    other: sessions.filter((s) => !bookmarkedSet.has(s.id)),
  };
}

export async function getSessionQuestions(
  sessionId: string
): Promise<AttendeeQuestion[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("session_questions")
    .select(
      "id, session_id, event_id, user_id, question_text, status, is_anonymous, upvote_count, answer_text, created_at"
    )
    .eq("session_id", sessionId)
    .in("status", ["approved", "answered"])
    .order("upvote_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  // Check which questions the current user has upvoted
  let upvotedIds = new Set<string>();
  if (user) {
    const { data: upvotes } = await supabase
      .from("question_upvotes")
      .select("question_id")
      .eq("user_id", user.id);
    upvotedIds = new Set(upvotes?.map((u) => u.question_id) ?? []);
  }

  return (data ?? []).map((q) => ({
    ...q,
    is_upvoted: upvotedIds.has(q.id),
  })) as AttendeeQuestion[];
}
