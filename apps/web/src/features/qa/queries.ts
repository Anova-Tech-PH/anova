import { createClient } from "@attendly/ui/supabase/server";

export type SessionQuestion = {
  id: string;
  session_id: string;
  event_id: string;
  user_id: string;
  question_text: string;
  status: "pending" | "approved" | "answered" | "rejected";
  is_anonymous: boolean;
  is_pinned: boolean;
  upvote_count: number;
  answer_text: string | null;
  answered_by: string | null;
  answered_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  session_title?: string;
};

export type QAStats = {
  total: number;
  pending: number;
  approved: number;
  answered: number;
  rejected: number;
};

export async function getQuestionsBySession(
  sessionId: string
): Promise<SessionQuestion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("session_questions")
    .select("*")
    .eq("session_id", sessionId)
    .in("status", ["approved", "answered"])
    .order("is_pinned", { ascending: false })
    .order("upvote_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as SessionQuestion[];
}

export async function getModerationQueue(
  eventId: string
): Promise<SessionQuestion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("session_questions")
    .select("*")
    .eq("event_id", eventId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  // Fetch session titles separately to avoid FK ambiguity issues
  const sessionIds = [...new Set((data ?? []).map((q) => q.session_id))];
  const { data: sessions } = sessionIds.length > 0
    ? await supabase.from("sessions").select("id, title").in("id", sessionIds)
    : { data: [] };

  const titleMap = new Map((sessions ?? []).map((s: { id: string; title: string }) => [s.id, s.title]));

  return (data ?? []).map((q) => ({
    ...q,
    session_title: titleMap.get(q.session_id) ?? undefined,
  })) as SessionQuestion[];
}

export async function getQAStats(eventId: string): Promise<QAStats> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("session_questions")
    .select("status")
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);

  const questions = data ?? [];
  return {
    total: questions.length,
    pending: questions.filter((q) => q.status === "pending").length,
    approved: questions.filter((q) => q.status === "approved").length,
    answered: questions.filter((q) => q.status === "answered").length,
    rejected: questions.filter((q) => q.status === "rejected").length,
  };
}
