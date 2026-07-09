"use server";

import { createClient } from "@/shared/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function createSpeaker(eventId: string, data: {
  name: string;
  title?: string;
  company?: string;
  bio?: string;
  photo?: string;
  email?: string;
}) {
  const supabase = await createClient();

  const { data: speaker, error } = await supabase
    .from("speakers")
    .insert({ event_id: eventId, ...data })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/schedule`);
  return speaker;
}

export async function updateSpeaker(eventId: string, speakerId: string, data: {
  name?: string;
  title?: string;
  company?: string;
  bio?: string;
  photo?: string;
  email?: string;
}) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("speakers")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", speakerId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/schedule`);
}

export async function deleteSpeaker(eventId: string, speakerId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("speakers")
    .delete()
    .eq("id", speakerId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/schedule`);
}
