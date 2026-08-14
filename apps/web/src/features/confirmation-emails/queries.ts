import { createClient } from "@attendly/ui/supabase/server";

export type EmailTemplate = {
  id: string;
  event_id: string;
  ticket_type_id: string | null;
  subject: string;
  body: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  ticket_type_name?: string;
};

export async function getTemplatesByEvent(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("confirmation_email_templates")
    .select("*, ticket_types(name)")
    .eq("event_id", eventId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((t: any) => ({
    ...t,
    ticket_type_name: t.ticket_types?.name ?? "All Tickets (Default)",
    ticket_types: undefined,
  })) as EmailTemplate[];
}

export async function getTemplateForTicket(eventId: string, ticketTypeId: string) {
  const supabase = await createClient();
  // Try ticket-specific template first
  const { data: specific } = await supabase
    .from("confirmation_email_templates")
    .select("*")
    .eq("event_id", eventId)
    .eq("ticket_type_id", ticketTypeId)
    .eq("enabled", true)
    .single();
  if (specific) return specific;
  // Fall back to default (null ticket_type_id)
  const { data: fallback } = await supabase
    .from("confirmation_email_templates")
    .select("*")
    .eq("event_id", eventId)
    .is("ticket_type_id", null)
    .eq("enabled", true)
    .single();
  return fallback;
}
