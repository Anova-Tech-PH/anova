"use server";

import { createClient } from "@attendly/ui/supabase/server";

export async function getTopics(
  eventId: string,
  options: {
    tab?: "all" | "following" | "by_organizers" | "new";
    search?: string;
  } = {}
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { tab = "all", search } = options;

  let query = supabase
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
    const { data: follows } = await supabase
      .from("community_topic_follows")
      .select("topic_id")
      .eq("user_id", user.id);
    const followedIds = follows?.map((f) => f.topic_id) ?? [];
    if (followedIds.length === 0) return [];
    query = query.in("id", followedIds);
  }

  if (tab === "by_organizers") {
    query = query.eq("type", "announcement");
  }

  const { data, error } = await query;
  if (error) throw error;

  // Fetch user follows and read status in parallel
  const [{ data: userFollows }, { data: readStatuses }] = await Promise.all([
    supabase
      .from("community_topic_follows")
      .select("topic_id")
      .eq("user_id", user.id),
    supabase
      .from("community_topic_read_status")
      .select("topic_id, last_read_at")
      .eq("user_id", user.id),
  ]);

  const followedSet = new Set(userFollows?.map((f) => f.topic_id) ?? []);
  const readMap = new Map(
    (readStatuses ?? []).map((r) => [r.topic_id, r.last_read_at])
  );

  // Get latest post timestamps per topic for unread calculation
  const topicIds = (data ?? []).map((t) => t.id);
  const { data: latestPosts } = topicIds.length > 0
    ? await supabase
        .from("community_posts")
        .select("topic_id, created_at")
        .in("topic_id", topicIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  // Find latest post per topic
  const latestPostMap = new Map<string, string>();
  for (const p of latestPosts ?? []) {
    if (!latestPostMap.has(p.topic_id)) {
      latestPostMap.set(p.topic_id, p.created_at);
    }
  }

  return (data ?? []).map((topic) => {
    const lastRead = readMap.get(topic.id);
    const latestPost = latestPostMap.get(topic.id);
    const hasUnread = latestPost
      ? !lastRead || new Date(latestPost) > new Date(lastRead)
      : false;

    return {
      ...topic,
      post_count: (topic.community_posts as unknown as { count: number }[])?.[0]?.count ?? 0,
      follower_count:
        (topic.community_topic_follows as unknown as { count: number }[])?.[0]?.count ?? 0,
      is_following: followedSet.has(topic.id),
      has_unread: hasUnread,
    };
  });
}

export async function getTopicDetail(topicId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: topic, error } = await supabase
    .from("community_topics")
    .select("*")
    .eq("id", topicId)
    .single();
  if (error) throw error;

  // Fetch posts and topic author in parallel
  const [{ data: posts }, { data: author }] = await Promise.all([
    supabase
      .from("community_posts")
      .select("id, author_id, content, created_at")
      .eq("topic_id", topicId)
      .order("created_at", { ascending: true }),
    supabase
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

  // Fetch post author profiles
  const { data: postProfiles } = postAuthorIds.length > 0
    ? await supabase
        .from("attendee_profiles")
        .select("id, display_name, avatar_url")
        .eq("event_id", topic.event_id)
        .in("id", postAuthorIds)
    : { data: [] as { id: string; display_name: string | null; avatar_url: string | null }[] };

  const profileMap = new Map(
    (postProfiles ?? []).map((p) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }])
  );

  // Fetch reactions and follow status in parallel (needs postIds)
  const [{ data: reactionRows }, { data: userReactionRows }, isFollowing] =
    await Promise.all([
      postIds.length > 0
        ? supabase
            .from("community_post_reactions")
            .select("post_id, emoji")
            .in("post_id", postIds)
        : Promise.resolve({
            data: [] as { post_id: string; emoji: string }[],
          }),
      user && postIds.length > 0
        ? supabase
            .from("community_post_reactions")
            .select("post_id, emoji")
            .eq("user_id", user.id)
            .in("post_id", postIds)
        : Promise.resolve({
            data: [] as { post_id: string; emoji: string }[],
          }),
      (async () => {
        if (!user) return false;
        const { data: follow } = await supabase
          .from("community_topic_follows")
          .select("user_id")
          .eq("user_id", user.id)
          .eq("topic_id", topicId)
          .single();
        return !!follow;
      })(),
    ]);

  // Build reaction counts per post
  const reactionCounts: Record<string, Record<string, number>> = {};
  for (const r of reactionRows ?? []) {
    if (!reactionCounts[r.post_id]) reactionCounts[r.post_id] = {};
    reactionCounts[r.post_id][r.emoji] =
      (reactionCounts[r.post_id][r.emoji] ?? 0) + 1;
  }

  // Build user reactions per post
  const userReactionMap: Record<string, string[]> = {};
  for (const r of userReactionRows ?? []) {
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

export async function getIcebreaker(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: icebreaker } = await supabase
    .from("event_icebreakers")
    .select("*")
    .eq("event_id", eventId)
    .eq("enabled", true)
    .single();

  if (!icebreaker) return null;

  let hasResponded = false;
  if (user) {
    const { data: response } = await supabase
      .from("icebreaker_responses")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .single();
    hasResponded = !!response;
  }

  return { ...icebreaker, hasResponded };
}

export async function getNewTopicCount(eventId: string) {
  const supabase = await createClient();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("community_topics")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .gte("created_at", oneDayAgo);
  return count ?? 0;
}
