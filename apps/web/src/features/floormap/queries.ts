import { createClient } from "@attendly/ui/supabase/server";

export async function getFloormapsByEvent(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("floormaps")
    .select("id, name, image_url, display_order, created_at")
    .eq("event_id", eventId)
    .order("display_order");

  if (error) throw error;
  return data;
}

export async function getFloormapWithMarkers(floormapId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("floormaps")
    .select("id, name, image_url, event_id, floormap_markers(id, label, x, y)")
    .eq("id", floormapId)
    .single();

  if (error) throw error;
  return data;
}

export async function getEventLocations(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("location")
    .eq("event_id", eventId)
    .not("location", "is", null);

  if (error) throw error;
  const unique = [...new Set(data.map((s) => s.location).filter(Boolean))];
  return unique as string[];
}

export type Floormap = Awaited<ReturnType<typeof getFloormapsByEvent>>[number];
export type FloormapWithMarkers = Awaited<ReturnType<typeof getFloormapWithMarkers>>;
