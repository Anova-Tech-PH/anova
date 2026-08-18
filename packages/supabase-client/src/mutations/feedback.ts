import type { SupabaseClient } from "@supabase/supabase-js";

export async function submitSessionFeedback(
  client: SupabaseClient,
  params: {
    sessionId: string;
    userId: string;
    feedbackFormId: string;
    answers: Record<string, string | number>;
  },
): Promise<void> {
  const { error } = await client.from("session_feedback").insert({
    session_id: params.sessionId,
    user_id: params.userId,
    feedback_form_id: params.feedbackFormId,
    answers: params.answers,
  });
  if (error) throw new Error(error.message);
}
