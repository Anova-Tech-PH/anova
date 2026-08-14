"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function publishEvent(eventId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  // Authorization enforced by RLS policy on events table
  const { error } = await supabase
    .from("events")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("id", eventId);

  if (error) throw error;

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
}

export async function unpublishEvent(eventId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  // Authorization enforced by RLS policy on events table
  const { error } = await supabase
    .from("events")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .eq("id", eventId);

  if (error) throw error;

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
}
