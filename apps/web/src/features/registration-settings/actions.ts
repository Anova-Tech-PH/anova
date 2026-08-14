"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";
import type { RegistrationSettings } from "./queries";

export async function updateRegistrationSettings(eventId: string, settings: RegistrationSettings) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("events")
    .update({ registration_settings: settings })
    .eq("id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/registration-settings`);
}

export async function addToWaitlist(eventId: string, data: {
  email: string;
  name: string;
  ticket_type_id?: string;
}) {
  if (!data.email?.trim()) throw new Error("Email is required");
  if (!data.name?.trim()) throw new Error("Name is required");

  const supabase = await createClient();
  const { error } = await supabase
    .from("waitlist_entries")
    .insert({
      event_id: eventId,
      email: data.email.trim().toLowerCase(),
      name: data.name.trim(),
      ticket_type_id: data.ticket_type_id || null,
    });

  if (error) {
    if (error.code === "23505") throw new Error("Email already on waitlist");
    throw new Error(error.message);
  }
  revalidatePath(`/events/${eventId}/registration-settings`);
}

export async function removeFromWaitlist(eventId: string, entryId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("waitlist_entries")
    .delete()
    .eq("id", entryId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/registration-settings`);
}
