import type { SupabaseClient } from "@supabase/supabase-js";

export async function getSessionPolls(
  client: SupabaseClient,
  sessionId: string
) {
  const { data, error } = await client
    .from("live_polls")
    .select("id, question, options, status, show_results, answer_type, sort_order, created_at")
    .eq("session_id", sessionId)
    .in("status", ["open", "closed"])
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getSessionPollVoteCounts(
  client: SupabaseClient,
  pollIds: string[]
) {
  if (pollIds.length === 0) return {};

  const { data, error } = await client
    .from("live_poll_votes")
    .select("poll_id, option_id, response_text, rating_value")
    .in("poll_id", pollIds);

  if (error) throw new Error(error.message);

  const counts: Record<string, Record<string, number>> = {};
  const totalVoters: Record<string, Set<string>> = {};

  for (const v of data ?? []) {
    counts[v.poll_id] ??= {};
    if (v.option_id) {
      counts[v.poll_id][v.option_id] = (counts[v.poll_id][v.option_id] ?? 0) + 1;
    }
  }

  return counts;
}

export async function getUserPollVotes(
  client: SupabaseClient,
  sessionId: string,
  userId: string
) {
  const { data: polls } = await client
    .from("live_polls")
    .select("id")
    .eq("session_id", sessionId);

  if (!polls || polls.length === 0) return {};

  const pollIds = polls.map((p) => p.id);

  const { data, error } = await client
    .from("live_poll_votes")
    .select("poll_id, option_id, response_text, rating_value")
    .in("poll_id", pollIds)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  // Map: pollId -> { optionIds, responseText, ratingValue }
  const votes: Record<
    string,
    { optionIds: string[]; responseText?: string; ratingValue?: number }
  > = {};

  for (const v of data ?? []) {
    votes[v.poll_id] ??= { optionIds: [] };
    if (v.option_id) {
      votes[v.poll_id].optionIds.push(v.option_id);
    }
    if (v.response_text) votes[v.poll_id].responseText = v.response_text;
    if (v.rating_value) votes[v.poll_id].ratingValue = v.rating_value;
  }

  return votes;
}
