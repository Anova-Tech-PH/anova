import type { SupabaseClient } from "@supabase/supabase-js";

export async function getActivityFeed(
  client: SupabaseClient,
  eventId: string,
  options: { page?: number; pageSize?: number } = {},
) {
  const { page = 1, pageSize = 20 } = options;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await client
    .from("activity_feed")
    .select(
      "id, event_id, user_id, type, reference_id, created_at, attendee_profiles!inner(display_name, avatar_url)",
      { count: "exact" },
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);
  return { items: data ?? [], total: count ?? 0 };
}
