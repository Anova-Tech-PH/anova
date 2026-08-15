"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

// ── createTriviaGame ──────────────────────────────────────────────────

export async function createTriviaGame(
  eventId: string,
  data: {
    title: string;
    description?: string;
    starts_at: string;
    ends_at: string;
    time_limit_seconds?: number;
    points_per_correct?: number;
  }
) {
  const supabase = await createClient();

  const { data: game, error } = await supabase
    .from("trivia_games")
    .insert({ event_id: eventId, ...data })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/gamification`);
  return game;
}

// ── updateTriviaGame ──────────────────────────────────────────────────

export async function updateTriviaGame(
  eventId: string,
  gameId: string,
  data: {
    title?: string;
    description?: string;
    starts_at?: string;
    ends_at?: string;
    status?: string;
    time_limit_seconds?: number;
    points_per_correct?: number;
  }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("trivia_games")
    .update(data)
    .eq("id", gameId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/gamification`);
}

// ── deleteTriviaGame ──────────────────────────────────────────────────

export async function deleteTriviaGame(eventId: string, gameId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("trivia_games")
    .delete()
    .eq("id", gameId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/gamification`);
}

// ── addTriviaQuestion ─────────────────────────────────────────────────

export async function addTriviaQuestion(
  gameId: string,
  data: {
    question_text: string;
    options: string[];
    correct_index: number;
    sort_order?: number;
  }
) {
  const supabase = await createClient();

  const { data: question, error } = await supabase
    .from("trivia_questions")
    .insert({ game_id: gameId, ...data })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return question;
}

// ── updateTriviaQuestion ──────────────────────────────────────────────

export async function updateTriviaQuestion(
  questionId: string,
  data: {
    question_text?: string;
    options?: string[];
    correct_index?: number;
    sort_order?: number;
  }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("trivia_questions")
    .update(data)
    .eq("id", questionId);

  if (error) throw new Error(error.message);
}

// ── deleteTriviaQuestion ──────────────────────────────────────────────

export async function deleteTriviaQuestion(questionId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("trivia_questions")
    .delete()
    .eq("id", questionId);

  if (error) throw new Error(error.message);
}

// ── getNextTriviaQuestion ─────────────────────────────────────────────

export async function getNextTriviaQuestion(
  gameId: string,
  questionIndex: number
) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_trivia_question", {
    _game_id: gameId,
    _question_index: questionIndex,
  });

  if (error) throw new Error(error.message);
  return data ?? null;
}

// ── submitTriviaAnswer ────────────────────────────────────────────────

export async function submitTriviaAnswer(
  gameId: string,
  userId: string,
  questionId: string,
  selectedIndex: number,
  timeMs: number
) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("submit_trivia_answer", {
    _game_id: gameId,
    _user_id: userId,
    _question_id: questionId,
    _selected_index: selectedIndex,
    _time_ms: timeMs,
  });

  if (error) throw new Error(error.message);
  return data as { correct: boolean; correct_index: number; points: number };
}

// ── completeTriviaGame ────────────────────────────────────────────────

export async function completeTriviaGame(gameId: string, userId: string) {
  const supabase = await createClient();

  // 1. Mark attempt as completed
  const { error: attemptError } = await supabase
    .from("trivia_attempts")
    .update({ completed_at: new Date().toISOString() })
    .eq("game_id", gameId)
    .eq("user_id", userId);

  if (attemptError) throw new Error(attemptError.message);

  // 2. Look up event_id from the trivia game
  const { data: game, error: gameError } = await supabase
    .from("trivia_games")
    .select("event_id")
    .eq("id", gameId)
    .single();

  if (gameError) throw new Error(gameError.message);

  const eventId = (game as { event_id: string }).event_id;

  // 3. Award points via award_points RPC
  const { error: awardError } = await supabase.rpc("award_points", {
    _event_id: eventId,
    _user_id: userId,
    _activity_type: "trivia_complete",
    _reference_id: gameId,
    _reference_type: "trivia_game",
  });

  if (awardError) throw new Error(awardError.message);

  revalidatePath(`/events/${eventId}/gamification`);
}
