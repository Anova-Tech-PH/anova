"use server";

import { createClient } from "@/shared/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function createPost(data: {
  event_id: string;
  type: string;
  content: string;
  image_url?: string;
  poll_options?: string[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      event_id: data.event_id,
      author_id: user.id,
      type: data.type,
      content: data.content,
      image_url: data.image_url || null,
      poll_options: data.poll_options ? data.poll_options.map((o, i) => ({ index: i, text: o, votes: 0 })) : null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  revalidatePath("/feed");
  return { ...post, profiles: profile };
}

export async function togglePostLike(postId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("post_likes")
    .select("user_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
    return { liked: false };
  } else {
    await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
    return { liked: true };
  }
}

export async function createComment(postId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: comment, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, author_id: user.id, content })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  return { ...comment, profiles: profile };
}

export async function deletePost(postId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw new Error(error.message);
  revalidatePath("/feed");
}

export async function votePoll(postId: string, optionIndex: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check existing vote
  const { data: existing } = await supabase
    .from("poll_votes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .single();

  if (existing) throw new Error("You already voted on this poll");

  const { error } = await supabase
    .from("poll_votes")
    .insert({ post_id: postId, user_id: user.id, option_index: optionIndex });

  if (error) throw new Error(error.message);
  revalidatePath("/feed");
}
