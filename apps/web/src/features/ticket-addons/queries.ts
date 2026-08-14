import { createClient } from "@attendly/ui/supabase/server";

export type TicketAddon = {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price: number;
  quantity: number | null;
  applies_to_tickets: string[] | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export async function getAddonsByEvent(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ticket_addons")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data as TicketAddon[];
}
