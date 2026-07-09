import { createClient } from "@/shared/utils/supabase/server";

export async function getPostsByEvent(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: posts, error } = await supabase
    .from("posts")
    .select(`
      *,
      profiles:author_id(full_name, avatar_url),
      comments(id, content, created_at, profiles:author_id(full_name, avatar_url))
    `)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  // Get user's likes
  let likedPostIds: Set<string> = new Set();
  if (user) {
    const { data: likes } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", user.id);
    likedPostIds = new Set(likes?.map((l) => l.post_id) ?? []);
  }

  // Get poll vote counts
  const postIds = posts?.filter((p) => p.type === "poll").map((p) => p.id) ?? [];
  let pollVotes: Record<string, Record<number, number>> = {};
  let userVotes: Record<string, number> = {};

  if (postIds.length > 0) {
    const { data: votes } = await supabase
      .from("poll_votes")
      .select("post_id, option_index, user_id")
      .in("post_id", postIds);

    for (const v of votes ?? []) {
      pollVotes[v.post_id] ??= {};
      pollVotes[v.post_id][v.option_index] = (pollVotes[v.post_id][v.option_index] ?? 0) + 1;
      if (v.user_id === user?.id) {
        userVotes[v.post_id] = v.option_index;
      }
    }
  }

  return (posts ?? []).map((post) => ({
    ...post,
    liked: likedPostIds.has(post.id),
    poll_vote_counts: pollVotes[post.id] ?? {},
    user_poll_vote: userVotes[post.id] ?? null,
  }));
}
