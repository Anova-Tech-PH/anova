"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

const BUILT_IN_TOPICS = [
  { key: "ask_organizers", title: "Ask Organizers Anything" },
  { key: "community_polls", title: "Community Polls" },
  { key: "lost_and_found", title: "Lost & Found" },
  { key: "job_openings", title: "Job Openings" },
  { key: "share_conferences", title: "Share Other Conferences" },
  { key: "article_sharing", title: "Article Sharing" },
  { key: "local_recommendations", title: "Local Recommendations" },
  { key: "first_timers", title: "First Timers" },
  { key: "tips", title: "Tips to make the most out of the event" },
  { key: "looking_forward", title: "What are you most looking forward to?" },
  { key: "lets_connect", title: "Let's Connect!" },
  { key: "beat_records", title: "Join the crowd: can you beat the records?" },
];

export async function createTopic(
  eventId: string,
  data: { title: string; description?: string }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: topic, error } = await supabase
    .from("discussion_topics")
    .insert({
      event_id: eventId,
      created_by: user.id,
      title: data.title,
      description: data.description ?? null,
      is_built_in: false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/discussion-topics`);
  return topic;
}

export async function updateTopic(
  eventId: string,
  topicId: string,
  data: { title?: string; description?: string }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("discussion_topics")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", topicId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/discussion-topics`);
}

export async function deleteTopic(eventId: string, topicId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("discussion_topics")
    .delete()
    .eq("id", topicId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/discussion-topics`);
}

export async function toggleTopicVisibility(
  eventId: string,
  topicId: string,
  isVisible: boolean
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("discussion_topics")
    .update({ is_visible: isVisible, updated_at: new Date().toISOString() })
    .eq("id", topicId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/discussion-topics`);
}

export async function seedBuiltInTopics(eventId: string) {
  const supabase = await createClient();

  // Check which built-in topics already exist
  const { data: existing } = await supabase
    .from("discussion_topics")
    .select("built_in_key")
    .eq("event_id", eventId)
    .eq("is_built_in", true);

  const existingKeys = new Set((existing ?? []).map((t) => t.built_in_key));
  const missing = BUILT_IN_TOPICS.filter((t) => !existingKeys.has(t.key));

  if (missing.length === 0) return;

  const rows = missing.map((t, i) => ({
    event_id: eventId,
    title: t.title,
    built_in_key: t.key,
    is_built_in: true,
    is_visible: true,
    sort_order: BUILT_IN_TOPICS.indexOf(t),
  }));

  const { error } = await supabase.from("discussion_topics").insert(rows);

  if (error) throw new Error(error.message);
}
