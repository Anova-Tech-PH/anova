import type { SupabaseClient } from "@supabase/supabase-js";

export async function askQuestion(
  client: SupabaseClient,
  params: {
    sessionId: string;
    eventId: string;
    userId: string;
    content: string;
    isAnonymous?: boolean;
  },
): Promise<void> {
  if (!params.content.trim()) throw new Error("Question cannot be empty");

  const { error } = await client.from("session_questions").insert({
    session_id: params.sessionId,
    event_id: params.eventId,
    user_id: params.userId,
    question_text: params.content.trim(),
    is_anonymous: params.isAnonymous ?? false,
    status: "approved",
  });

  if (error) throw new Error(error.message);
}

export async function toggleUpvote(
  client: SupabaseClient,
  questionId: string,
  userId: string,
): Promise<{ upvoted: boolean }> {
  const { data: existing } = await client
    .from("question_upvotes")
    .select("id")
    .eq("question_id", questionId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    await client
      .from("question_upvotes")
      .delete()
      .eq("question_id", questionId)
      .eq("user_id", userId);
    return { upvoted: false };
  } else {
    const { error } = await client
      .from("question_upvotes")
      .insert({ question_id: questionId, user_id: userId });
    if (error) throw new Error(error.message);
    return { upvoted: true };
  }
}
