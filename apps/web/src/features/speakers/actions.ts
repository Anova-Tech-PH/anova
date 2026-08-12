"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function createSpeaker(eventId: string, data: {
  name: string;
  title?: string;
  company?: string;
  bio?: string;
  photo?: string;
  email?: string;
  linkedin_url?: string;
  twitter_handle?: string;
  website_url?: string;
  is_featured?: boolean;
  sort_order?: number;
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
  linkedin_url?: string;
  twitter_handle?: string;
  website_url?: string;
  is_featured?: boolean;
  sort_order?: number;
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

export async function bulkImportSpeakers(eventId: string, rows: {
  name: string;
  title?: string;
  company?: string;
  bio?: string;
  email?: string;
  linkedin_url?: string;
  twitter_handle?: string;
  website_url?: string;
}[]) {
  if (rows.length === 0) {
    throw new Error("No rows to import");
  }

  const supabase = await createClient();

  const insertData = rows.map((row) => ({
    event_id: eventId,
    ...row,
  }));

  const { data, error } = await supabase
    .from("speakers")
    .insert(insertData)
    .select();

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/schedule`);
  return data;
}
