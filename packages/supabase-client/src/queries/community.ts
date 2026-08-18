import type { SupabaseClient } from "@supabase/supabase-js";

export async function getTopics(
  client: SupabaseClient,
  eventId: string,
  userId: string,
  options?: { tab?: string; search?: string }
) {
  const { tab = "all", search } = options ?? {};

  let query = client
    .from("community_topics")
    .select(
      `
      id, event_id, author_id, title, type, description, pinned,
      meetup_date, meetup_location, created_at, updated_at,
      community_posts(count),
      community_topic_follows(count)
    `
    )
    .eq("event_id", eventId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  if (tab === "following") {
    const { data: follows } = await client
      .from("community_topic_follows")
      .select("topic_id")
      .eq("user_id", userId);
    const followedIds = (follows ?? []).map((f: { topic_id: string }) => f.topic_id);
    if (followedIds.length === 0) return [];
    query = query.in("id", followedIds);
  }

  if (tab === "by_organizers") {
    query = query.eq("type", "announcement");
  }

  const { data, error } = await query;
  if (error) throw error;

  // Fetch user follows and read status
  const [{ data: userFollows }, { data: readStatuses }] = await Promise.all([
    client
      .from("community_topic_follows")
      .select("topic_id")
      .eq("user_id", userId),
    client
      .from("community_topic_read_status")
      .select("topic_id, last_read_at")
      .eq("user_id", userId),
  ]);

  const followedSet = new Set(
    (userFollows ?? []).map((f: { topic_id: string }) => f.topic_id)
  );
  const readMap = new Map(
    ((readStatuses ?? []) as { topic_id: string; last_read_at: string }[]).map(
      (r) => [r.topic_id, r.last_read_at]
    )
  );

  const topicIds = (data ?? []).map((t: { id: string }) => t.id);
  const { data: latestPosts } =
    topicIds.length > 0
      ? await client
          .from("community_posts")
          .select("topic_id, created_at")
          .in("topic_id", topicIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const latestPostMap = new Map<string, string>();
  for (const p of (latestPosts ?? []) as { topic_id: string; created_at: string }[]) {
    if (!latestPostMap.has(p.topic_id)) {
      latestPostMap.set(p.topic_id, p.created_at);
    }
  }

  return (data ?? []).map(
    (topic: {
      id: string;
      community_posts: { count: number }[];
      community_topic_follows: { count: number }[];
    }) => {
      const lastRead = readMap.get(topic.id);
      const latestPost = latestPostMap.get(topic.id);
      const hasUnread = latestPost
        ? !lastRead || new Date(latestPost) > new Date(lastRead)
        : false;

      return {
        ...topic,
        post_count: topic.community_posts?.[0]?.count ?? 0,
        follower_count: topic.community_topic_follows?.[0]?.count ?? 0,
        is_following: followedSet.has(topic.id),
        has_unread: hasUnread,
      };
    }
  );
}

export async function getTopicDetail(
  client: SupabaseClient,
  topicId: string,
  userId?: string
) {
  const { data: topic, error } = await client
    .from("community_topics")
    .select("*")
    .eq("id", topicId)
    .single();
  if (error) throw error;

  const [{ data: posts }, { data: author }] = await Promise.all([
    client
      .from("community_posts")
      .select("id, author_id, content, created_at")
      .eq("topic_id", topicId)
      .order("created_at", { ascending: true }),
    client
      .from("attendee_profiles")
      .select("display_name, avatar_url")
      .eq("id", topic.author_id)
      .eq("event_id", topic.event_id)
      .single(),
  ]);

  const postIds = (posts ?? []).map((p: { id: string }) => p.id);
  const postAuthorIds = [
    ...new Set((posts ?? []).map((p: { author_id: string }) => p.author_id)),
  ];

  const { data: postProfiles } =
    postAuthorIds.length > 0
      ? await client
          .from("attendee_profiles")
          .select("id, display_name, avatar_url")
          .eq("event_id", topic.event_id)
          .in("id", postAuthorIds)
      : { data: [] };

  const profileMap = new Map(
    ((postProfiles ?? []) as { id: string; display_name: string | null; avatar_url: string | null }[]).map(
      (p) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }]
    )
  );

  const [{ data: reactionRows }, { data: userReactionRows }, isFollowing] =
    await Promise.all([
      postIds.length > 0
        ? client
            .from("community_post_reactions")
            .select("post_id, emoji")
            .in("post_id", postIds)
        : Promise.resolve({ data: [] as { post_id: string; emoji: string }[] }),
      userId && postIds.length > 0
        ? client
            .from("community_post_reactions")
            .select("post_id, emoji")
            .eq("user_id", userId)
            .in("post_id", postIds)
        : Promise.resolve({ data: [] as { post_id: string; emoji: string }[] }),
      (async () => {
        if (!userId) return false;
        const { data: follow } = await client
          .from("community_topic_follows")
          .select("user_id")
          .eq("user_id", userId)
          .eq("topic_id", topicId)
          .single();
        return !!follow;
      })(),
    ]);

  const reactionCounts: Record<string, Record<string, number>> = {};
  for (const r of (reactionRows ?? []) as { post_id: string; emoji: string }[]) {
    if (!reactionCounts[r.post_id]) reactionCounts[r.post_id] = {};
    reactionCounts[r.post_id][r.emoji] =
      (reactionCounts[r.post_id][r.emoji] ?? 0) + 1;
  }

  const userReactionMap: Record<string, string[]> = {};
  for (const r of (userReactionRows ?? []) as { post_id: string; emoji: string }[]) {
    if (!userReactionMap[r.post_id]) userReactionMap[r.post_id] = [];
    userReactionMap[r.post_id].push(r.emoji);
  }

  return {
    ...topic,
    author,
    posts: (posts ?? []).map((post: { id: string; author_id: string }) => ({
      ...post,
      attendee_profiles: profileMap.get(post.author_id) ?? null,
      reactions: reactionCounts[post.id] ?? {},
      user_reactions: userReactionMap[post.id] ?? [],
    })),
    is_following: isFollowing,
  };
}

export async function getIcebreaker(
  client: SupabaseClient,
  eventId: string,
  userId?: string
) {
  const { data: icebreaker } = await client
    .from("event_icebreakers")
    .select("*")
    .eq("event_id", eventId)
    .eq("enabled", true)
    .single();

  if (!icebreaker) return null;

  let hasResponded = false;
  if (userId) {
    const { data: response } = await client
      .from("icebreaker_responses")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .single();
    hasResponded = !!response;
  }

  return { ...icebreaker, hasResponded };
}
