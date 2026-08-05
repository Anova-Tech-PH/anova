import type { SupabaseClient } from "@supabase/supabase-js";

export async function getPostsByEvent(
  client: SupabaseClient,
  eventId: string,
  userId?: string
) {
  const { data: posts, error } = await client
    .from("posts")
    .select(`
      *,
      comments(id, content, created_at, author_id)
    `)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  if (!posts || posts.length === 0) return [];

  // Collect all unique author IDs (from posts and comments)
  const authorIds = new Set<string>();
  for (const post of posts) {
    authorIds.add(post.author_id);
    for (const comment of post.comments ?? []) {
      authorIds.add(comment.author_id);
    }
  }

  // Fetch profiles in one query
  const { data: profiles } = await client
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", Array.from(authorIds));

  const profileMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
  for (const p of profiles ?? []) {
    profileMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
  }

  // Get user's likes
  let likedPostIds: Set<string> = new Set();
  if (userId) {
    const { data: likes } = await client
      .from("post_likes")
      .select("post_id")
      .eq("user_id", userId);
    likedPostIds = new Set(likes?.map((l) => l.post_id) ?? []);
  }

  // Get poll vote counts
  const postIds = posts.filter((p) => p.type === "poll").map((p) => p.id);
  let pollVotes: Record<string, Record<number, number>> = {};
  let userVotes: Record<string, number> = {};

  if (postIds.length > 0) {
    const { data: votes } = await client
      .from("poll_votes")
      .select("post_id, option_index, user_id")
      .in("post_id", postIds);

    for (const v of votes ?? []) {
      pollVotes[v.post_id] ??= {};
      pollVotes[v.post_id][v.option_index] = (pollVotes[v.post_id][v.option_index] ?? 0) + 1;
      if (v.user_id === userId) {
        userVotes[v.post_id] = v.option_index;
      }
    }
  }

  return posts.map((post) => ({
    ...post,
    profiles: profileMap[post.author_id] ?? null,
    comments: (post.comments ?? []).map((c: any) => ({
      ...c,
      profiles: profileMap[c.author_id] ?? null,
    })),
    liked: likedPostIds.has(post.id),
    poll_vote_counts: pollVotes[post.id] ?? {},
    user_poll_vote: userVotes[post.id] ?? null,
  }));
}
