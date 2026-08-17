import { createClient } from "@attendly/ui/supabase/server";

export type TicketRestriction = {
  id: string;
  ticket_type_id: string;
  restriction_type: "email_list" | "org_domain" | "domain_type" | "membership";
  values: string[];
  created_at: string;
  updated_at: string;
};

export async function getRestrictionsByEvent(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ticket_restrictions")
    .select("*, ticket_types!inner(event_id)")
    .eq("ticket_types.event_id", eventId);

  if (error) throw new Error(error.message);
  return (data ?? []) as (TicketRestriction & { ticket_types: { event_id: string } })[];
}
