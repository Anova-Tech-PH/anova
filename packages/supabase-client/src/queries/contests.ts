import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * List active contests for an event, ordered by created_at desc.
 * Returns empty array on error.
 */
export async function getContests(
  client: SupabaseClient,
  eventId: string,
): Promise<
  {
    id: string;
    event_id: string;
    type: string;
    title: string;
    description: string | null;
    image_url: string | null;
    starts_at: string | null;
    ends_at: string | null;
    status: string;
    points_per_action: number;
    created_at: string;
  }[]
> {
  const { data, error } = await client
    .from("contests")
    .select(
      "id, event_id, type, title, description, image_url, starts_at, ends_at, status, points_per_action, created_at",
    )
    .eq("event_id", eventId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

/**
 * Get a single contest by ID.
 * Returns null on error or not found.
 */
export async function getContestDetail(
  client: SupabaseClient,
  contestId: string,
) {
  const { data, error } = await client
    .from("contests")
    .select(
      "id, event_id, type, title, description, image_url, starts_at, ends_at, status, points_per_action, created_at",
    )
    .eq("id", contestId)
    .single();

  if (error) return null;
  return data;
}

/**
 * Get contest entries with profile join, ordered by likes_count desc.
 * Returns empty array on error.
 */
export async function getContestEntries(
  client: SupabaseClient,
  contestId: string,
) {
  const { data, error } = await client
    .from("contest_entries")
    .select(
      "id, contest_id, user_id, content, image_url, likes_count, created_at, profiles(full_name, avatar_url)",
    )
    .eq("contest_id", contestId)
    .order("likes_count", { ascending: false });

  if (error) return [];
  return data ?? [];
}

/**
 * Get the entry IDs a user has liked for a given contest.
 * Uses contest_likes table, joining through contest_entries to filter by contest.
 * Returns empty array of entry_id strings on error.
 */
export async function getUserContestLikes(
  client: SupabaseClient,
  contestId: string,
  userId: string,
): Promise<string[]> {
  const { data, error } = await client
    .from("contest_likes")
    .select("entry_id, contest_entries!inner(contest_id)")
    .eq("contest_entries.contest_id", contestId)
    .eq("user_id", userId);

  if (error) return [];
  return (data ?? []).map(
    (row: Record<string, unknown>) => row.entry_id as string,
  );
}
