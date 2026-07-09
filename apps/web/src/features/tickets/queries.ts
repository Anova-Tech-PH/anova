import { createClient } from "@/shared/utils/supabase/server";

export async function getTicketTypesByEvent(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ticket_types")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return data;
}

export async function getTicketTypesWithCounts(eventId: string) {
  const supabase = await createClient();

  const { data: tickets, error } = await supabase
    .from("ticket_types")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order");

  if (error) throw new Error(error.message);

  // Get registration counts per ticket type
  const { data: counts } = await supabase
    .from("registrations")
    .select("ticket_type_id")
    .eq("event_id", eventId)
    .in("status", ["confirmed", "checked_in"]);

  const countMap: Record<string, number> = {};
  for (const r of counts ?? []) {
    countMap[r.ticket_type_id] = (countMap[r.ticket_type_id] ?? 0) + 1;
  }

  return tickets.map((t) => ({
    ...t,
    sold: countMap[t.id] ?? 0,
  }));
}
