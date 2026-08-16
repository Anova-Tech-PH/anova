"use server";

import { createClient } from "@attendly/ui/supabase/server";

export type ActivityFeedItem = {
  id: string;
  event_id: string;
  user_id: string;
  type: "announcement" | "photo" | "community_post" | "meetup";
  reference_id: string | null;
  created_at: string;
  attendee_profiles: {
    display_name: string;
    avatar_url: string | null;
  };
};

export async function getActivityFeed(
  eventId: string,
  options: {
    page?: number;
    pageSize?: number;
  } = {}
) {
  const supabase = await createClient();
  const { page = 1, pageSize = 20 } = options;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await supabase
    .from("activity_feed")
    .select(
      "id, event_id, user_id, type, reference_id, created_at, attendee_profiles!inner(display_name, avatar_url)",
      { count: "exact" }
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { items: (data ?? []) as unknown as ActivityFeedItem[], total: count ?? 0 };
}
