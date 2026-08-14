import { createClient } from "@attendly/ui/supabase/server";

export type DiscussionTopic = {
  id: string;
  event_id: string;
  created_by: string | null;
  title: string;
  description: string | null;
  is_built_in: boolean;
  built_in_key: string | null;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export async function getDiscussionTopics(
  eventId: string
): Promise<{ custom: DiscussionTopic[]; builtIn: DiscussionTopic[]; total: number }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("discussion_topics")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const topics = (data ?? []) as DiscussionTopic[];
  const custom = topics.filter((t) => !t.is_built_in);
  const builtIn = topics.filter((t) => t.is_built_in);

  return {
    custom,
    builtIn,
    total: custom.length,
  };
}
