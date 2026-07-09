"use server";

import { createClient } from "@/shared/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function createTicketType(eventId: string, data: {
  name: string;
  description?: string;
  type: string;
  price: number;
  quantity?: number;
  sales_start?: string;
  sales_end?: string;
}) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("ticket_types")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const sortOrder = existing?.[0] ? existing[0].sort_order + 1 : 0;

  const { data: ticket, error } = await supabase
    .from("ticket_types")
    .insert({
      event_id: eventId,
      name: data.name,
      description: data.description || null,
      type: data.type,
      price: data.price,
      quantity: data.quantity || null,
      sales_start: data.sales_start || null,
      sales_end: data.sales_end || null,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/tickets`);
  return ticket;
}

export async function updateTicketType(eventId: string, ticketId: string, data: {
  name?: string;
  description?: string;
  type?: string;
  price?: number;
  quantity?: number | null;
  sales_start?: string | null;
  sales_end?: string | null;
}) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("ticket_types")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/tickets`);
}

export async function deleteTicketType(eventId: string, ticketId: string) {
  const supabase = await createClient();

  // Check for existing registrations
  const { count } = await supabase
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("ticket_type_id", ticketId);

  if (count && count > 0) {
    throw new Error(`Cannot delete: ${count} registration(s) use this ticket type`);
  }

  const { error } = await supabase
    .from("ticket_types")
    .delete()
    .eq("id", ticketId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/tickets`);
}
