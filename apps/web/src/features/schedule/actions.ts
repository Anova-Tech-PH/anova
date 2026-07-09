"use server";

import { createClient } from "@/shared/utils/supabase/server";
import { revalidatePath } from "next/cache";

// --- Tracks ---

export async function createTrack(eventId: string, data: { name: string; color?: string }) {
  const supabase = await createClient();

  // Get next sort order
  const { data: existing } = await supabase
    .from("tracks")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const sortOrder = existing?.[0] ? existing[0].sort_order + 1 : 0;

  const { data: track, error } = await supabase
    .from("tracks")
    .insert({ event_id: eventId, name: data.name, color: data.color, sort_order: sortOrder })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/schedule`);
  return track;
}

export async function updateTrack(eventId: string, trackId: string, data: { name?: string; color?: string }) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tracks")
    .update(data)
    .eq("id", trackId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/schedule`);
}

export async function deleteTrack(eventId: string, trackId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tracks")
    .delete()
    .eq("id", trackId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/schedule`);
}

// --- Sessions ---

export async function createSession(eventId: string, data: {
  title: string;
  description?: string;
  type: string;
  start_time: string;
  end_time: string;
  location?: string;
  track_id?: string;
  speaker_ids?: string[];
}) {
  const supabase = await createClient();

  const { speaker_ids, ...sessionData } = data;

  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      event_id: eventId,
      ...sessionData,
      track_id: sessionData.track_id || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Link speakers
  if (speaker_ids && speaker_ids.length > 0) {
    const { error: linkError } = await supabase
      .from("session_speakers")
      .insert(speaker_ids.map((sid) => ({ session_id: session.id, speaker_id: sid })));

    if (linkError) throw new Error(linkError.message);
  }

  revalidatePath(`/events/${eventId}/schedule`);
  return session;
}

export async function updateSession(eventId: string, sessionId: string, data: {
  title?: string;
  description?: string;
  type?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  track_id?: string | null;
  speaker_ids?: string[];
}) {
  const supabase = await createClient();

  const { speaker_ids, ...sessionData } = data;

  const { error } = await supabase
    .from("sessions")
    .update({ ...sessionData, updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (error) throw new Error(error.message);

  // Update speaker links if provided
  if (speaker_ids !== undefined) {
    await supabase
      .from("session_speakers")
      .delete()
      .eq("session_id", sessionId);

    if (speaker_ids.length > 0) {
      const { error: linkError } = await supabase
        .from("session_speakers")
        .insert(speaker_ids.map((sid) => ({ session_id: sessionId, speaker_id: sid })));

      if (linkError) throw new Error(linkError.message);
    }
  }

  revalidatePath(`/events/${eventId}/schedule`);
}

export async function deleteSession(eventId: string, sessionId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/schedule`);
}
