"use server";

import { createClient } from "@attendly/ui/supabase/server";
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

  revalidatePath(`/events/${eventId}/schedule`, "layout");
  return track;
}

export async function updateTrack(eventId: string, trackId: string, data: { name?: string; color?: string }) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tracks")
    .update(data)
    .eq("id", trackId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/schedule`, "layout");
}

export async function deleteTrack(eventId: string, trackId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tracks")
    .delete()
    .eq("id", trackId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/schedule`, "layout");
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
  enable_check_in?: boolean;
  capacity?: number | null;
  rsvp_enabled?: boolean;
  document_ids?: string[];
  poll_ids?: string[];
}) {
  const supabase = await createClient();

  const { speaker_ids, capacity, rsvp_enabled, document_ids, poll_ids, ...sessionData } = data;

  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      event_id: eventId,
      ...sessionData,
      track_id: sessionData.track_id || null,
      capacity: capacity ?? null,
      rsvp_enabled: rsvp_enabled ?? false,
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

  // Link documents
  if (document_ids && document_ids.length > 0) {
    await supabase
      .from("event_documents")
      .update({ session_id: session.id })
      .in("id", document_ids);
  }

  // Link polls
  if (poll_ids && poll_ids.length > 0) {
    await supabase
      .from("live_polls")
      .update({ session_id: session.id })
      .in("id", poll_ids);
  }

  revalidatePath(`/events/${eventId}/schedule`, "layout");
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
  enable_check_in?: boolean;
  capacity?: number | null;
  rsvp_enabled?: boolean;
  document_ids?: string[];
  poll_ids?: string[];
}) {
  const supabase = await createClient();

  const { speaker_ids, capacity, rsvp_enabled, document_ids, poll_ids, ...sessionData } = data;

  const { error } = await supabase
    .from("sessions")
    .update({
      ...sessionData,
      updated_at: new Date().toISOString(),
      ...(capacity !== undefined ? { capacity } : {}),
      ...(rsvp_enabled !== undefined ? { rsvp_enabled } : {}),
    })
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

  // Update document links if provided
  if (document_ids !== undefined) {
    // Unlink all documents currently linked to this session
    await supabase
      .from("event_documents")
      .update({ session_id: null })
      .eq("session_id", sessionId);

    // Link selected documents
    if (document_ids.length > 0) {
      await supabase
        .from("event_documents")
        .update({ session_id: sessionId })
        .in("id", document_ids);
    }
  }

  // Update poll links if provided
  if (poll_ids !== undefined) {
    // Unlink all polls currently linked to this session
    await supabase
      .from("live_polls")
      .update({ session_id: null })
      .eq("session_id", sessionId);

    // Link selected polls
    if (poll_ids.length > 0) {
      await supabase
        .from("live_polls")
        .update({ session_id: sessionId })
        .in("id", poll_ids);
    }
  }

  revalidatePath(`/events/${eventId}/schedule`, "layout");
}

export async function deleteSession(eventId: string, sessionId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/schedule`, "layout");
}

// --- Bulk Import ---

export interface BulkImportSession {
  title: string;
  description: string;
  type: string;
  start_time: string;
  end_time: string;
  location: string;
  trackName: string;
  speakerNames: string[];
}

const MAX_IMPORT_SESSIONS = 200;

export async function bulkImportSessions(eventId: string, sessions: BulkImportSession[]) {
  if (sessions.length === 0) {
    throw new Error("No sessions to import");
  }
  if (sessions.length > MAX_IMPORT_SESSIONS) {
    throw new Error(`Cannot import more than ${MAX_IMPORT_SESSIONS} sessions at once`);
  }

  const supabase = await createClient();

  // 1. Fetch existing tracks for this event
  const { data: existingTracks } = await supabase
    .from("tracks")
    .select("id, name, sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false });

  const trackMap = new Map<string, string>();
  let nextSortOrder = (existingTracks?.[0]?.sort_order ?? -1) + 1;

  for (const t of existingTracks ?? []) {
    trackMap.set(t.name.toLowerCase(), t.id);
  }

  // 2. Collect unique track names that need creation
  const newTrackNames = new Set<string>();
  for (const s of sessions) {
    if (s.trackName && !trackMap.has(s.trackName.toLowerCase())) {
      newTrackNames.add(s.trackName);
    }
  }

  // Create missing tracks
  for (const name of newTrackNames) {
    const { data: track, error } = await supabase
      .from("tracks")
      .insert({ event_id: eventId, name, sort_order: nextSortOrder++ })
      .select("id")
      .single();

    if (error) throw new Error(`Failed to create track "${name}": ${error.message}`);
    trackMap.set(name.toLowerCase(), track.id);
  }

  // 3. Fetch existing speakers for this event
  const { data: existingSpeakers } = await supabase
    .from("speakers")
    .select("id, name")
    .eq("event_id", eventId);

  const speakerMap = new Map<string, string>();
  for (const sp of existingSpeakers ?? []) {
    speakerMap.set(sp.name.toLowerCase(), sp.id);
  }

  // 4. Collect unique speaker names that need creation
  const newSpeakerNames = new Set<string>();
  for (const s of sessions) {
    for (const name of s.speakerNames) {
      if (!speakerMap.has(name.toLowerCase())) {
        newSpeakerNames.add(name);
      }
    }
  }

  // Create missing speakers
  for (const name of newSpeakerNames) {
    const { data: speaker, error } = await supabase
      .from("speakers")
      .insert({ event_id: eventId, name })
      .select("id")
      .single();

    if (error) throw new Error(`Failed to create speaker "${name}": ${error.message}`);
    speakerMap.set(name.toLowerCase(), speaker.id);
  }

  // 5. Insert sessions and link speakers
  for (const s of sessions) {
    const trackId = s.trackName ? trackMap.get(s.trackName.toLowerCase()) ?? null : null;

    const { data: session, error } = await supabase
      .from("sessions")
      .insert({
        event_id: eventId,
        title: s.title,
        description: s.description || null,
        type: s.type,
        start_time: s.start_time,
        end_time: s.end_time,
        location: s.location || null,
        track_id: trackId,
      })
      .select("id")
      .single();

    if (error) throw new Error(`Failed to create session "${s.title}": ${error.message}`);

    // Link speakers
    if (s.speakerNames.length > 0) {
      const speakerLinks = s.speakerNames
        .map((name) => speakerMap.get(name.toLowerCase()))
        .filter((id): id is string => !!id)
        .map((speakerId) => ({ session_id: session.id, speaker_id: speakerId }));

      if (speakerLinks.length > 0) {
        const { error: linkError } = await supabase
          .from("session_speakers")
          .insert(speakerLinks);

        if (linkError) throw new Error(`Failed to link speakers: ${linkError.message}`);
      }
    }
  }

  revalidatePath(`/events/${eventId}/schedule`, "layout");
}
