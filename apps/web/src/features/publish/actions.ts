"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function publishEvent(eventId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("events")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("id", eventId);

  if (error) throw error;

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath("/dashboard");
}

export async function unpublishEvent(eventId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("events")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .eq("id", eventId);

  if (error) throw error;

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath("/dashboard");
}
