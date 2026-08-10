import { createClient } from "@attendly/ui/supabase/server";

export type PollOption = {
  id: string;
  text: string;
};

export type LivePoll = {
  id: string;
  event_id: string;
  session_id: string | null;
  created_by: string;
  question: string;
  options: PollOption[];
  status: "draft" | "open" | "closed";
  show_results: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PollWithResults = LivePoll & {
  vote_counts: Record<string, number>;
  total_votes: number;
  session_title?: string;
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

    results.push({
      ...poll,
      options: (poll.options ?? []) as PollOption[],
      vote_counts,
      total_votes: votes?.length ?? 0,
      session_title: sessionTitle ?? undefined,
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

  return {
    ...poll,
    options: (poll.options ?? []) as PollOption[],
    vote_counts,
    total_votes: votes?.length ?? 0,
    session_title: sessionTitle ?? undefined,
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

    results.push({
      ...poll,
      options: (poll.options ?? []) as PollOption[],
      vote_counts,
      total_votes: votes?.length ?? 0,
      session_title: sessionTitle ?? undefined,
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
