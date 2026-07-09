"use server";

import { createClient } from "@/shared/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateEventStatus(eventId: string, status: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("events")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", eventId);

  if (error) throw error;

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
}

export async function deleteEvent(eventId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("events").delete().eq("id", eventId);

  if (error) throw error;

  revalidatePath("/events");
}
