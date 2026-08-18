import type { SupabaseClient } from "@supabase/supabase-js";

export async function submitTriviaAnswer(
  client: SupabaseClient,
  params: {
    gameId: string;
    questionId: string;
    userId: string;
    selectedOption: number;
  },
): Promise<{ correct: boolean; correctOption: number }> {
  // Fetch the question to check answer
  const { data: question, error: qError } = await client
    .from("trivia_questions")
    .select("correct_option")
    .eq("id", params.questionId)
    .single();

  if (qError) throw new Error(qError.message);

  const correct = question.correct_option === params.selectedOption;

  // Record the answer
  const { error } = await client.from("trivia_answers").insert({
    game_id: params.gameId,
    question_id: params.questionId,
    user_id: params.userId,
    selected_option: params.selectedOption,
    is_correct: correct,
  });

  if (error) throw new Error(error.message);

  return { correct, correctOption: question.correct_option };
}
