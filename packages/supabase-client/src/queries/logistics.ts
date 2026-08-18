import type { SupabaseClient } from "@supabase/supabase-js";

export async function getLogisticsItems(client: SupabaseClient, eventId: string) {
  const { data, error } = await client
    .from("logistics_items")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}
