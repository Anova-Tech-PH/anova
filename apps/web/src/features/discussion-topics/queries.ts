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

export type PastEventTopicGroup = {
  eventId: string;
  eventTitle: string;
  topics: { title: string; description: string | null }[];
};

export async function getPastEventTopics(
  currentEventId: string
): Promise<PastEventTopicGroup[]> {
  const supabase = await createClient();

  // 1. Get current event's organization_id
  const { data: currentEvent, error: eventError } = await supabase
    .from("events")
    .select("organization_id")
    .eq("id", currentEventId)
    .single();

  if (eventError || !currentEvent) throw new Error("Event not found");

  // 2. Find all other events in the same organization
  const { data: otherEvents, error: eventsError } = await supabase
    .from("events")
    .select("id, title")
    .eq("organization_id", currentEvent.organization_id)
    .neq("id", currentEventId)
    .order("start_date", { ascending: false });

  if (eventsError) throw new Error(eventsError.message);
  if (!otherEvents || otherEvents.length === 0) return [];

  const eventIds = otherEvents.map((e) => e.id);

  // 3. Get all custom (non-built-in) discussion topics from those events
  const { data: topics, error: topicsError } = await supabase
    .from("discussion_topics")
    .select("event_id, title, description")
    .in("event_id", eventIds)
    .eq("is_built_in", false)
    .order("created_at", { ascending: true });

  if (topicsError) throw new Error(topicsError.message);
  if (!topics || topics.length === 0) return [];

  // 4. Group by event
  const eventMap = new Map(otherEvents.map((e) => [e.id, e.title]));
  const groups = new Map<string, PastEventTopicGroup>();

  for (const topic of topics) {
    const eventTitle = eventMap.get(topic.event_id) ?? "Unknown Event";
    if (!groups.has(topic.event_id)) {
      groups.set(topic.event_id, {
        eventId: topic.event_id,
        eventTitle,
        topics: [],
      });
    }
    groups.get(topic.event_id)!.topics.push({
      title: topic.title,
      description: topic.description,
    });
  }

  return Array.from(groups.values());
}
