"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";
import type { LogisticsData } from "./queries";

export async function updateLogistics(
  eventId: string,
  data: {
    venue_description?: string;
    venue_map_url?: string;
    logistics?: Partial<LogisticsData>;
  }
) {
  const supabase = await createClient();

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.venue_description !== undefined) {
    updatePayload.venue_description = data.venue_description;
  }
  if (data.venue_map_url !== undefined) {
    updatePayload.venue_map_url = data.venue_map_url;
  }

  if (data.logistics) {
    // Fetch existing logistics to merge
    const { data: existing, error: fetchError } = await supabase
      .from("events")
      .select("logistics")
      .eq("id", eventId)
      .single();

    if (fetchError) throw new Error(fetchError.message);

    const merged = { ...(existing?.logistics ?? {}), ...data.logistics };
    updatePayload.logistics = merged;
  }

  const { error } = await supabase
    .from("events")
    .update(updatePayload)
    .eq("id", eventId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/logistics`);
}
