"use server";

import { createClient } from "@attendly/ui/supabase/server";

// ── Types ────────────────────────────────────────────────────────────

export type Contest = {
  id: string;
  event_id: string;
  type: "photo" | "caption" | "icebreaker";
  title: string;
  description: string | null;
  image_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: "draft" | "active" | "ended";
  points_per_action: number;
  created_at: string;
  prize_description: string | null;
  winner_criteria: string | null;
  theme: string | null;
};

export type ContestEntry = {
  id: string;
  contest_id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  likes_count: number;
  created_at: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

// ── Query Functions ──────────────────────────────────────────────────

/**
 * Get contests for an event, with optional status/type filter.
 * Returns empty array on error.
 */
export async function getContests(
  eventId: string,
  filter?: { status?: string; type?: string }
): Promise<Contest[]> {
  const supabase = await createClient();

  let query = supabase
    .from("contests")
    .select("*")
    .eq("event_id", eventId);

  if (filter?.status) {
    query = query.eq("status", filter.status);
  }
  if (filter?.type) {
    query = query.eq("type", filter.type);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) return [];
  return (data as Contest[]) ?? [];
}

/**
 * Get a single contest by ID.
 * Returns null on error or not found.
 */
export async function getContest(contestId: string): Promise<Contest | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contests")
    .select("*")
    .eq("id", contestId)
    .single();

  if (error) return null;
  return data as Contest;
}

/**
 * Get contest entries with profile join, ordered by likes_count DESC.
 * Returns empty array on error.
 */
export async function getContestEntries(
  contestId: string
): Promise<ContestEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contest_entries")
    .select("*, profiles(full_name, avatar_url)")
    .eq("contest_id", contestId)
    .order("likes_count", { ascending: false });

  if (error) return [];
  return (data as unknown as ContestEntry[]) ?? [];
}

/**
 * Get the set of entry IDs that a user has liked for a given contest.
 * Returns empty Set on error.
 */
export async function getUserLikes(
  contestId: string,
  userId: string
): Promise<Set<string>> {
  const supabase = await createClient();

  // Join through contest_entries to filter by contest_id
  const { data, error } = await supabase
    .from("contest_likes")
    .select("entry_id, contest_entries!inner(contest_id)")
    .eq("contest_entries.contest_id", contestId)
    .eq("user_id", userId);

  if (error) return new Set();
  return new Set(
    (data ?? []).map((row: Record<string, unknown>) => row.entry_id as string)
  );
}
