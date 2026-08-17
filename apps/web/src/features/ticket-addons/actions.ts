"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function createAddon(
  eventId: string,
  data: {
    name: string;
    description?: string;
    price: number;
    quantity?: number | null;
    limit_per_order?: number | null;
    available_until?: string | null;
    applies_to_tickets?: string[] | null;
  }
) {
  if (!data.name?.trim()) throw new Error("Name is required");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: existing } = await supabase
    .from("ticket_addons")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const sortOrder = existing?.[0] ? existing[0].sort_order + 1 : 0;

  const { data: addon, error } = await supabase
    .from("ticket_addons")
    .insert({
      event_id: eventId,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      price: data.price,
      quantity: data.quantity ?? null,
      limit_per_order: data.limit_per_order ?? 10,
      available_until: data.available_until ?? null,
      applies_to_tickets: data.applies_to_tickets ?? null,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/ticket-addons`);
  return addon;
}

export async function updateAddon(
  eventId: string,
  addonId: string,
  data: {
    name?: string;
    description?: string | null;
    price?: number;
    quantity?: number | null;
    limit_per_order?: number | null;
    available_until?: string | null;
    applies_to_tickets?: string[] | null;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("ticket_addons")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", addonId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/ticket-addons`);
}

export async function deleteAddon(eventId: string, addonId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("ticket_addons")
    .delete()
    .eq("id", addonId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/ticket-addons`);
}
