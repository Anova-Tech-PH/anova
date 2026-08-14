import { createClient } from "@attendly/ui/supabase/server";

export async function getGroupTickets(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ticket_types")
    .select("*")
    .eq("event_id", eventId)
    .gt("group_size", 1)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data;
}
