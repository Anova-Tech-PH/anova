import type { SupabaseClient } from "@supabase/supabase-js";

export async function createPostMutation(
  client: SupabaseClient,
  userId: string,
  data: {
    event_id: string;
    type: string;
    content: string;
    image_url?: string;
    poll_options?: string[];
  }
) {
  const { data: post, error } = await client
    .from("posts")
    .insert({
      event_id: data.event_id,
      author_id: userId,
      type: data.type,
      content: data.content,
      image_url: data.image_url || null,
      poll_options: data.poll_options
        ? data.poll_options.map((o, i) => ({ index: i, text: o, votes: 0 }))
        : null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const { data: profile } = await client
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", userId)
    .single();

  return { ...post, profiles: profile };
}

export async function togglePostLikeMutation(
  client: SupabaseClient,
  postId: string,
  userId: string
) {
  const { data: existing } = await client
    .from("post_likes")
    .select("user_id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    await client.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
    return { liked: false };
  } else {
    await client.from("post_likes").insert({ post_id: postId, user_id: userId });
    return { liked: true };
  }
}

export async function createCommentMutation(
  client: SupabaseClient,
  postId: string,
  userId: string,
  content: string
) {
  const { data: comment, error } = await client
    .from("comments")
    .insert({ post_id: postId, author_id: userId, content })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const { data: profile } = await client
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", userId)
    .single();

  return { ...comment, profiles: profile };
}

export async function deletePostMutation(
  client: SupabaseClient,
  postId: string
) {
  const { error } = await client.from("posts").delete().eq("id", postId);
  if (error) throw new Error(error.message);
}

export async function votePollMutation(
  client: SupabaseClient,
  postId: string,
  userId: string,
  optionIndex: number
) {
  // Check existing vote
  const { data: existing } = await client
    .from("poll_votes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .single();

  if (existing) throw new Error("You already voted on this poll");

  const { error } = await client
    .from("poll_votes")
    .insert({ post_id: postId, user_id: userId, option_index: optionIndex });

  if (error) throw new Error(error.message);
}
