import { createClient } from "@attendly/ui/supabase/server";
import type { LogisticsItem } from "./constants";

export type { LogisticsItem } from "./constants";
export { TEMPLATES } from "./constants";

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
