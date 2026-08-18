import type { SupabaseClient } from "@supabase/supabase-js";

export async function getFloormapsByEvent(client: SupabaseClient, eventId: string) {
  const { data, error } = await client
    .from("floormaps")
    .select("id, name, image_url, display_order, created_at")
    .eq("event_id", eventId)
    .order("display_order");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getFloormapWithMarkers(client: SupabaseClient, floormapId: string) {
  const { data, error } = await client
    .from("floormaps")
    .select("id, name, image_url, event_id, floormap_markers(id, label, x, y)")
    .eq("id", floormapId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}
