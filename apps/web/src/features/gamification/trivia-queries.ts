"use server";

import { createClient } from "@attendly/ui/supabase/server";

// ============================================================
// Types
// ============================================================

export type TriviaGame = {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  time_limit_seconds: number | null;
  points_per_correct: number;
  created_at: string;
  question_count: number;
};

export type TriviaQuestion = {
  id: string;
  game_id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  sort_order: number;
};

export type TriviaAttempt = {
  id: string;
  game_id: string;
  user_id: string;
  answers: unknown[];
  score: number;
  total_time_ms: number;
  completed_at: string | null;
  created_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
};

// ============================================================
// Query Functions
// ============================================================

/**
 * Get trivia games for an event with question counts.
 * Optionally filter by status.
 * Returns empty array on error.
 */
export async function getTriviaGames(
  eventId: string,
  filter?: { status?: string }
): Promise<TriviaGame[]> {
  const supabase = await createClient();

  let query = supabase
    .from("trivia_games")
    .select("*, trivia_questions(count)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (filter?.status) {
    query = query.eq("status", filter.status);
  }

  const { data, error } = await query;

  if (error) return [];

  return (data ?? []).map((row: Record<string, unknown>) => {
    const questionsArr = row.trivia_questions as
      | { count: number }[]
      | undefined;
    const questionCount = questionsArr?.[0]?.count ?? 0;
    return {
      id: row.id as string,
      event_id: row.event_id as string,
      title: row.title as string,
      description: row.description as string | null,
      starts_at: row.starts_at as string,
      ends_at: row.ends_at as string,
      status: row.status as string,
      time_limit_seconds: row.time_limit_seconds as number | null,
      points_per_correct: row.points_per_correct as number,
      created_at: row.created_at as string,
      question_count: questionCount,
    };
  });
}

/**
 * Get trivia questions for a game, ordered by sort_order.
 * Includes correct_index (org-only use).
 * Returns empty array on error.
 */
export async function getTriviaQuestions(
  gameId: string
): Promise<TriviaQuestion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("trivia_questions")
    .select("*")
    .eq("game_id", gameId)
    .order("sort_order");

  if (error) return [];
  return (data as TriviaQuestion[]) ?? [];
}

/**
 * Get trivia leaderboard for a game.
 * Returns completed attempts with profile info, ordered by score DESC then total_time_ms ASC.
 * Returns empty array on error.
 */
export async function getTriviaLeaderboard(
  gameId: string
): Promise<TriviaAttempt[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("trivia_attempts")
    .select(
      "id, game_id, user_id, answers, score, total_time_ms, completed_at, created_at, profiles(full_name, avatar_url)"
    )
    .eq("game_id", gameId)
    .not("completed_at", "is", null)
    .order("score", { ascending: false })
    .order("total_time_ms", { ascending: true });

  if (error) return [];

  return (data ?? []).map((row: Record<string, unknown>) => {
    const profiles = row.profiles as {
      full_name: string | null;
      avatar_url: string | null;
    } | null;
    return {
      id: row.id as string,
      game_id: row.game_id as string,
      user_id: row.user_id as string,
      answers: row.answers as unknown[],
      score: row.score as number,
      total_time_ms: row.total_time_ms as number,
      completed_at: row.completed_at as string | null,
      created_at: row.created_at as string,
      profile: profiles
        ? {
            full_name: profiles.full_name,
            avatar_url: profiles.avatar_url,
          }
        : undefined,
    };
  });
}

/**
 * Get a user's trivia attempt for a game.
 * Returns null if not found or on error.
 */
export async function getUserTriviaAttempt(
  gameId: string,
  userId: string
): Promise<TriviaAttempt | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("trivia_attempts")
    .select("*")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return data as TriviaAttempt;
}

/**
 * Get the number of questions in a trivia game.
 * Returns 0 on error.
 */
export async function getTriviaQuestionCount(
  gameId: string
): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("trivia_questions")
    .select("*", { count: "exact", head: true })
    .eq("game_id", gameId);

  if (error) return 0;
  return count ?? 0;
}
