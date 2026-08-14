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

  const { data: userFollows } = await supabase
    .from("community_topic_follows")
    .select("topic_id")
    .eq("user_id", user.id);
  const followedSet = new Set(userFollows?.map((f) => f.topic_id) ?? []);

  return (data ?? []).map((topic) => ({
    ...topic,
    post_count: (topic.community_posts as unknown as { count: number }[])?.[0]?.count ?? 0,
    follower_count:
      (topic.community_topic_follows as unknown as { count: number }[])?.[0]?.count ?? 0,
    is_following: followedSet.has(topic.id),
  }));
}

export async function getTopicDetail(topicId: string) {
  const supabase = await createClient();

  const { data: topic, error } = await supabase
    .from("community_topics")
    .select("*")
    .eq("id", topicId)
    .single();
  if (error) throw error;

  const { data: posts } = await supabase
    .from("community_posts")
    .select(
      "id, author_id, content, created_at, attendee_profiles(display_name, avatar_url)"
    )
    .eq("topic_id", topicId)
    .order("created_at", { ascending: true });

  const { data: author } = await supabase
    .from("attendee_profiles")
    .select("display_name, avatar_url")
    .eq("id", topic.author_id)
    .eq("event_id", topic.event_id)
    .single();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isFollowing = false;
  if (user) {
    const { data: follow } = await supabase
      .from("community_topic_follows")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("topic_id", topicId)
      .single();
    isFollowing = !!follow;
  }

  return {
    ...topic,
    author,
    posts: posts ?? [],
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
