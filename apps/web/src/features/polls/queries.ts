import { createClient } from "@attendly/ui/supabase/server";

export type PollOption = {
  id: string;
  text: string;
};

export type AnswerType =
  | "multiple_choice"
  | "checkbox"
  | "short_answer"
  | "star_rating"
  | "word_cloud";

export type LivePoll = {
  id: string;
  event_id: string;
  session_id: string | null;
  created_by: string;
  question: string;
  options: PollOption[];
  status: "draft" | "open" | "closed";
  show_results: boolean;
  is_anonymous: boolean;
  prompt_attendee: boolean;
  result_visibility: "everyone" | "after_closed" | "organizers_only";
  open_time_mode: "now" | "before_session" | "scheduled";
  open_before_minutes: number;
  scheduled_open_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  answer_type: AnswerType;
};

export type PollWithResults = LivePoll & {
  vote_counts: Record<string, number>;
  total_votes: number;
  session_title?: string;
  average_rating?: number;
  rating_distribution?: Record<number, number>;
  text_responses?: string[];
  word_frequencies?: Record<string, number>;
};

export async function getPolls(eventId: string): Promise<PollWithResults[]> {
  const supabase = await createClient();

  const { data: polls, error } = await supabase
    .from("live_polls")
    .select("*, sessions(title)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const results: PollWithResults[] = [];
  for (const poll of polls ?? []) {
    const { data: votes } = await supabase
      .from("live_poll_votes")
      .select("option_id")
      .eq("poll_id", poll.id);

    const vote_counts: Record<string, number> = {};
    for (const v of votes ?? []) {
      vote_counts[v.option_id] = (vote_counts[v.option_id] ?? 0) + 1;
    }

    const sessions = poll.sessions as unknown as { title: string }[] | { title: string } | null;
    const sessionTitle = Array.isArray(sessions) ? sessions[0]?.title : sessions?.title;

    let average_rating: number | undefined;
    let rating_distribution: Record<number, number> | undefined;
    let text_responses: string[] | undefined;
    let word_frequencies: Record<string, number> | undefined;

    const answerType = (poll.answer_type as AnswerType) ?? "multiple_choice";

    if (answerType === "star_rating") {
      const { data: ratingVotes } = await supabase
        .from("live_poll_votes")
        .select("rating_value")
        .eq("poll_id", poll.id)
        .not("rating_value", "is", null);

      const ratings = (ratingVotes ?? []).map((v) => v.rating_value as number);
      if (ratings.length > 0) {
        average_rating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        rating_distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        for (const r of ratings) {
          rating_distribution[r] = (rating_distribution[r] ?? 0) + 1;
        }
      }
    } else if (answerType === "short_answer") {
      const { data: textVotes } = await supabase
        .from("live_poll_votes")
        .select("response_text")
        .eq("poll_id", poll.id)
        .not("response_text", "is", null);

      text_responses = (textVotes ?? []).map((v) => v.response_text as string);
    } else if (answerType === "word_cloud") {
      const { data: wordVotes } = await supabase
        .from("live_poll_votes")
        .select("response_text")
        .eq("poll_id", poll.id)
        .not("response_text", "is", null);

      word_frequencies = {};
      for (const v of wordVotes ?? []) {
        const word = (v.response_text as string).toLowerCase().trim();
        word_frequencies[word] = (word_frequencies[word] ?? 0) + 1;
      }
    }

    results.push({
      ...poll,
      options: (poll.options ?? []) as PollOption[],
      answer_type: answerType,
      vote_counts,
      total_votes: votes?.length ?? 0,
      session_title: sessionTitle ?? undefined,
      average_rating,
      rating_distribution,
      text_responses,
      word_frequencies,
    });
  }

  return results;
}

export async function getPollWithResults(pollId: string): Promise<PollWithResults | null> {
  const supabase = await createClient();

  const { data: poll, error } = await supabase
    .from("live_polls")
    .select("*, sessions(title)")
    .eq("id", pollId)
    .single();

  if (error || !poll) return null;

  const { data: votes } = await supabase
    .from("live_poll_votes")
    .select("option_id")
    .eq("poll_id", pollId);

  const vote_counts: Record<string, number> = {};
  for (const v of votes ?? []) {
    vote_counts[v.option_id] = (vote_counts[v.option_id] ?? 0) + 1;
  }

  const sessions = poll.sessions as unknown as { title: string }[] | { title: string } | null;
  const sessionTitle = Array.isArray(sessions) ? sessions[0]?.title : sessions?.title;

  let average_rating: number | undefined;
  let rating_distribution: Record<number, number> | undefined;
  let text_responses: string[] | undefined;
  let word_frequencies: Record<string, number> | undefined;

  const answerType = (poll.answer_type as AnswerType) ?? "multiple_choice";

  if (answerType === "star_rating") {
    const { data: ratingVotes } = await supabase
      .from("live_poll_votes")
      .select("rating_value")
      .eq("poll_id", poll.id)
      .not("rating_value", "is", null);

    const ratings = (ratingVotes ?? []).map((v) => v.rating_value as number);
    if (ratings.length > 0) {
      average_rating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      rating_distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (const r of ratings) {
        rating_distribution[r] = (rating_distribution[r] ?? 0) + 1;
      }
    }
  } else if (answerType === "short_answer") {
    const { data: textVotes } = await supabase
      .from("live_poll_votes")
      .select("response_text")
      .eq("poll_id", poll.id)
      .not("response_text", "is", null);

    text_responses = (textVotes ?? []).map((v) => v.response_text as string);
  } else if (answerType === "word_cloud") {
    const { data: wordVotes } = await supabase
      .from("live_poll_votes")
      .select("response_text")
      .eq("poll_id", poll.id)
      .not("response_text", "is", null);

    word_frequencies = {};
    for (const v of wordVotes ?? []) {
      const word = (v.response_text as string).toLowerCase().trim();
      word_frequencies[word] = (word_frequencies[word] ?? 0) + 1;
    }
  }

  return {
    ...poll,
    options: (poll.options ?? []) as PollOption[],
    answer_type: answerType,
    vote_counts,
    total_votes: votes?.length ?? 0,
    session_title: sessionTitle ?? undefined,
    average_rating,
    rating_distribution,
    text_responses,
    word_frequencies,
  };
}

export async function getActivePolls(eventId: string): Promise<PollWithResults[]> {
  const supabase = await createClient();

  const { data: polls, error } = await supabase
    .from("live_polls")
    .select("*, sessions(title)")
    .eq("event_id", eventId)
    .eq("status", "open")
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);

  const results: PollWithResults[] = [];
  for (const poll of polls ?? []) {
    const { data: votes } = await supabase
      .from("live_poll_votes")
      .select("option_id")
      .eq("poll_id", poll.id);

    const vote_counts: Record<string, number> = {};
    for (const v of votes ?? []) {
      vote_counts[v.option_id] = (vote_counts[v.option_id] ?? 0) + 1;
    }

    const sessions = poll.sessions as unknown as { title: string }[] | { title: string } | null;
    const sessionTitle = Array.isArray(sessions) ? sessions[0]?.title : sessions?.title;

    let average_rating: number | undefined;
    let rating_distribution: Record<number, number> | undefined;
    let text_responses: string[] | undefined;
    let word_frequencies: Record<string, number> | undefined;

    const answerType = (poll.answer_type as AnswerType) ?? "multiple_choice";

    if (answerType === "star_rating") {
      const { data: ratingVotes } = await supabase
        .from("live_poll_votes")
        .select("rating_value")
        .eq("poll_id", poll.id)
        .not("rating_value", "is", null);

      const ratings = (ratingVotes ?? []).map((v) => v.rating_value as number);
      if (ratings.length > 0) {
        average_rating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        rating_distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        for (const r of ratings) {
          rating_distribution[r] = (rating_distribution[r] ?? 0) + 1;
        }
      }
    } else if (answerType === "short_answer") {
      const { data: textVotes } = await supabase
        .from("live_poll_votes")
        .select("response_text")
        .eq("poll_id", poll.id)
        .not("response_text", "is", null);

      text_responses = (textVotes ?? []).map((v) => v.response_text as string);
    } else if (answerType === "word_cloud") {
      const { data: wordVotes } = await supabase
        .from("live_poll_votes")
        .select("response_text")
        .eq("poll_id", poll.id)
        .not("response_text", "is", null);

      word_frequencies = {};
      for (const v of wordVotes ?? []) {
        const word = (v.response_text as string).toLowerCase().trim();
        word_frequencies[word] = (word_frequencies[word] ?? 0) + 1;
      }
    }

    results.push({
      ...poll,
      options: (poll.options ?? []) as PollOption[],
      answer_type: answerType,
      vote_counts,
      total_votes: votes?.length ?? 0,
      session_title: sessionTitle ?? undefined,
      average_rating,
      rating_distribution,
      text_responses,
      word_frequencies,
    });
  }

  return results;
}

export async function getUserVote(pollId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("live_poll_votes")
    .select("option_id")
    .eq("poll_id", pollId)
    .eq("user_id", user.id)
    .single();

  return data?.option_id ?? null;
}
