import { createClient } from "@attendly/ui/supabase/server";

export interface LogisticsItem {
  id: string;
  event_id: string;
  template: "welcome" | "venue" | "parking" | "hotel" | "travel_info" | "floor_map" | "custom";
  title: string;
  content: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const TEMPLATES = [
  { value: "welcome", label: "Welcome" },
  { value: "venue", label: "Venue" },
  { value: "floor_map", label: "Floor Map" },
  { value: "travel_info", label: "Travel Info" },
  { value: "parking", label: "Parking" },
  { value: "hotel", label: "Hotel" },
  { value: "custom", label: "Custom" },
] as const;

export async function getLogisticsItems(eventId: string): Promise<LogisticsItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("logistics_items")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}
