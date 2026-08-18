import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * List active trivia games for an event with question counts.
 * Returns empty array on error.
 */
export async function getTriviaGames(
  client: SupabaseClient,
  eventId: string,
) {
  const { data, error } = await client
    .from("trivia_games")
    .select("*, trivia_questions(count)")
    .eq("event_id", eventId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []).map((game: Record<string, unknown>) => ({
    ...game,
    question_count:
      (
        game.trivia_questions as { count: number }[] | undefined
      )?.[0]?.count ?? 0,
  }));
}

/**
 * Get a single trivia game by ID.
 * Returns null on error or not found.
 */
export async function getTriviaGameDetail(
  client: SupabaseClient,
  gameId: string,
) {
  const { data, error } = await client
    .from("trivia_games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (error) return null;
  return data;
}

/**
 * Get trivia questions for a game (without correct answer for security).
 * Returns empty array on error.
 */
export async function getTriviaQuestions(
  client: SupabaseClient,
  gameId: string,
) {
  const { data, error } = await client
    .from("trivia_questions")
    .select("id, game_id, question_text, options, sort_order")
    .eq("game_id", gameId)
    .order("sort_order", { ascending: true });

  if (error) return [];
  return data ?? [];
}

/**
 * Get a user's trivia attempt for a game.
 * Returns null if not found or on error.
 */
export async function getUserTriviaAttempt(
  client: SupabaseClient,
  gameId: string,
  userId: string,
) {
  const { data, error } = await client
    .from("trivia_attempts")
    .select("*")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return null;
  return data;
}

/**
 * Get trivia leaderboard for a game (completed attempts with profiles).
 * Returns empty array on error.
 */
export async function getTriviaLeaderboard(
  client: SupabaseClient,
  gameId: string,
) {
  const { data, error } = await client
    .from("trivia_attempts")
    .select("*, profiles(full_name, avatar_url)")
    .eq("game_id", gameId)
    .not("completed_at", "is", null)
    .order("score", { ascending: false })
    .order("total_time_ms", { ascending: true });

  if (error) return [];
  return data ?? [];
}
