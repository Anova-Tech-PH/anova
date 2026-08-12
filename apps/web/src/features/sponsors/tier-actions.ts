"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function createTier(
  eventId: string,
  data: {
    name: string;
    sort_order?: number;
    logo_size?: "large" | "medium" | "small";
    benefits?: unknown[];
  }
) {
  const supabase = await createClient();

  const { data: tier, error } = await supabase
    .from("sponsor_tiers")
    .insert({
      event_id: eventId,
      name: data.name,
      sort_order: data.sort_order ?? 0,
      logo_size: data.logo_size ?? "medium",
      benefits: data.benefits ?? [],
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/sponsors`);
  return tier;
}

export async function updateTier(
  eventId: string,
  tierId: string,
  data: {
    name?: string;
    sort_order?: number;
    logo_size?: "large" | "medium" | "small";
    benefits?: unknown[];
  }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("sponsor_tiers")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", tierId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/sponsors`);
}

export async function deleteTier(eventId: string, tierId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("sponsor_tiers")
    .delete()
    .eq("id", tierId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/sponsors`);
}
