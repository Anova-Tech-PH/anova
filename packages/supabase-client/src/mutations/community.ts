import type { SupabaseClient } from "@supabase/supabase-js";

export async function createTopic(
  client: SupabaseClient,
  params: {
    eventId: string;
    authorId: string;
    title: string;
    description?: string;
    type?: string;
  },
): Promise<{ id: string }> {
  const { data, error } = await client
    .from("community_topics")
    .insert({
      event_id: params.eventId,
      author_id: params.authorId,
      title: params.title.trim(),
      description: params.description?.trim() ?? null,
      type: params.type ?? "discussion",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createPost(
  client: SupabaseClient,
  params: {
    topicId: string;
    authorId: string;
    content: string;
  },
): Promise<void> {
  if (!params.content.trim()) throw new Error("Post cannot be empty");

  const { error } = await client.from("community_posts").insert({
    topic_id: params.topicId,
    author_id: params.authorId,
    content: params.content.trim(),
  });
  if (error) throw new Error(error.message);
}

export async function toggleReaction(
  client: SupabaseClient,
  postId: string,
  userId: string,
  emoji: string,
): Promise<{ reacted: boolean }> {
  const { data: existing } = await client
    .from("community_post_reactions")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .eq("emoji", emoji)
    .single();

  if (existing) {
    await client
      .from("community_post_reactions")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId)
      .eq("emoji", emoji);
    return { reacted: false };
  } else {
    const { error } = await client
      .from("community_post_reactions")
      .insert({ post_id: postId, user_id: userId, emoji });
    if (error) throw new Error(error.message);
    return { reacted: true };
  }
}

export async function toggleFollow(
  client: SupabaseClient,
  topicId: string,
  userId: string,
): Promise<{ following: boolean }> {
  const { data: existing } = await client
    .from("community_topic_follows")
    .select("user_id")
    .eq("topic_id", topicId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    await client
      .from("community_topic_follows")
      .delete()
      .eq("topic_id", topicId)
      .eq("user_id", userId);
    return { following: false };
  } else {
    const { error } = await client
      .from("community_topic_follows")
      .insert({ topic_id: topicId, user_id: userId });
    if (error) throw new Error(error.message);
    return { following: true };
  }
}
