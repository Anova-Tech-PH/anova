"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function createTopic(
  eventId: string,
  data: {
    title: string;
    type: "discussion" | "announcement" | "meetup" | "ask_organizer";
    description?: string;
    meetup_date?: string;
    meetup_location?: string;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("community_topics").insert({
    event_id: eventId,
    author_id: user.id,
    title: data.title,
    type: data.type,
    description: data.description ?? null,
    meetup_date: data.meetup_date ?? null,
    meetup_location: data.meetup_location ?? null,
  });
  if (error) throw error;
  revalidatePath("/");
}

export async function deleteTopic(topicId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("community_topics")
    .delete()
    .eq("id", topicId);
  if (error) throw error;
  revalidatePath("/");
}

export async function createPost(topicId: string, content: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  if (!content.trim()) throw new Error("Post cannot be empty");

  const { error } = await supabase.from("community_posts").insert({
    topic_id: topicId,
    author_id: user.id,
    content: content.trim(),
  });
  if (error) throw error;
  revalidatePath("/");
}

export async function deletePost(postId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("community_posts")
    .delete()
    .eq("id", postId);
  if (error) throw error;
  revalidatePath("/");
}

export async function toggleFollow(topicId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("community_topic_follows")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("topic_id", topicId)
    .single();

  if (existing) {
    await supabase
      .from("community_topic_follows")
      .delete()
      .eq("user_id", user.id)
      .eq("topic_id", topicId);
  } else {
    await supabase.from("community_topic_follows").insert({
      user_id: user.id,
      topic_id: topicId,
    });
  }
  revalidatePath("/");
}

export async function saveIcebreakerConfig(
  eventId: string,
  data: {
    question: string;
    options: string[];
    enabled: boolean;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("event_icebreakers").upsert(
    {
      event_id: eventId,
      question: data.question,
      options: data.options,
      enabled: data.enabled,
    },
    { onConflict: "event_id" }
  );
  if (error) throw error;
  revalidatePath("/");
}

export async function submitIcebreaker(
  eventId: string,
  data: {
    introduction: string;
    answer: string;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("icebreaker_responses").upsert(
    {
      event_id: eventId,
      user_id: user.id,
      introduction: data.introduction,
      answer: data.answer,
    },
    { onConflict: "event_id,user_id" }
  );
  if (error) throw error;
  revalidatePath("/");
}
