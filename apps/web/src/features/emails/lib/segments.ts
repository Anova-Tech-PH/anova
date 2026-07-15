import { createClient } from "@/shared/utils/supabase/server";

type SegmentFilters = {
  ticket_type_ids?: string[];
  statuses?: string[];
  checked_in?: boolean;
};

export async function getSegmentedRecipients(
  eventId: string,
  filters?: SegmentFilters
) {
  const supabase = await createClient();

  let query = supabase
    .from("registrations")
    .select("id, name, email, status, ticket_type_id, ticket_types(name)")
    .eq("event_id", eventId)
    .eq("unsubscribed", false);

  if (filters?.ticket_type_ids && filters.ticket_type_ids.length > 0) {
    query = query.in("ticket_type_id", filters.ticket_type_ids);
  }

  if (filters?.statuses && filters.statuses.length > 0) {
    query = query.in("status", filters.statuses);
  } else {
    // Default: only confirmed and checked-in attendees
    query = query.in("status", ["confirmed", "checked_in"]);
  }

  if (filters?.checked_in === true) {
    query = query.eq("status", "checked_in");
  } else if (filters?.checked_in === false) {
    query = query.neq("status", "checked_in");
  }

  const { data, error } = await query.order("name");

  if (error) throw new Error(error.message);
  return data;
}
