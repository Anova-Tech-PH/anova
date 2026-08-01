"use server";

import { createClient } from "@attendly/ui/supabase/server";
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

export async function duplicateEvent(eventId: string) {
  const supabase = await createClient();

  // Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Fetch original event
  const { data: original, error: fetchError } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();
  if (fetchError || !original) throw new Error("Event not found");

  // Verify org membership
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", original.organization_id)
    .eq("user_id", user.id)
    .single();
  if (!membership) throw new Error("Not a member of this organization");

  // Clone event
  const { data: newEvent, error: insertError } = await supabase
    .from("events")
    .insert({
      organization_id: original.organization_id,
      title: `${original.title} (Copy)`,
      slug: `${original.slug}-copy-${Date.now()}`,
      description: original.description,
      start_date: original.start_date,
      end_date: original.end_date,
      timezone: original.timezone,
      venue_name: original.venue_name,
      venue_address: original.venue_address,
      is_virtual: original.is_virtual,
      virtual_url: original.virtual_url,
      cover_image: original.cover_image,
      status: "draft",
      theme: original.theme,
      settings: original.settings,
    })
    .select("id")
    .single();
  if (insertError || !newEvent) throw new Error(insertError?.message ?? "Failed to create event");

  const newEventId = newEvent.id;

  // Clone ticket_types
  const { data: tickets } = await supabase
    .from("ticket_types")
    .select("name, description, type, price, quantity, sort_order")
    .eq("event_id", eventId);
  if (tickets && tickets.length > 0) {
    await supabase
      .from("ticket_types")
      .insert(tickets.map((t) => ({ ...t, event_id: newEventId })));
  }

  // Clone tracks with ID mapping
  const trackMap = new Map<string, string>();
  const { data: tracks } = await supabase
    .from("tracks")
    .select("id, name, color, sort_order")
    .eq("event_id", eventId);
  if (tracks && tracks.length > 0) {
    for (const track of tracks) {
      const { data: newTrack } = await supabase
        .from("tracks")
        .insert({
          event_id: newEventId,
          name: track.name,
          color: track.color,
          sort_order: track.sort_order,
        })
        .select("id")
        .single();
      if (newTrack) trackMap.set(track.id, newTrack.id);
    }
  }

  // Clone speakers with ID mapping
  const speakerMap = new Map<string, string>();
  const { data: speakers } = await supabase
    .from("speakers")
    .select("id, name, title, company, bio, photo, email")
    .eq("event_id", eventId);
  if (speakers && speakers.length > 0) {
    for (const speaker of speakers) {
      const { data: newSpeaker } = await supabase
        .from("speakers")
        .insert({
          event_id: newEventId,
          name: speaker.name,
          title: speaker.title,
          company: speaker.company,
          bio: speaker.bio,
          photo: speaker.photo,
          email: speaker.email,
        })
        .select("id")
        .single();
      if (newSpeaker) speakerMap.set(speaker.id, newSpeaker.id);
    }
  }

  // Clone sessions with track_id remapped
  const sessionMap = new Map<string, string>();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, track_id, title, description, type, start_time, end_time, location")
    .eq("event_id", eventId);
  if (sessions && sessions.length > 0) {
    for (const session of sessions) {
      const { data: newSession } = await supabase
        .from("sessions")
        .insert({
          event_id: newEventId,
          track_id: session.track_id ? trackMap.get(session.track_id) ?? null : null,
          title: session.title,
          description: session.description,
          type: session.type,
          start_time: session.start_time,
          end_time: session.end_time,
          location: session.location,
        })
        .select("id")
        .single();
      if (newSession) sessionMap.set(session.id, newSession.id);
    }
  }

  // Clone session_speakers with remapped IDs
  const { data: sessionSpeakers } = await supabase
    .from("session_speakers")
    .select("session_id, speaker_id")
    .in("session_id", sessions?.map((s) => s.id) ?? []);
  if (sessionSpeakers && sessionSpeakers.length > 0) {
    const mapped = sessionSpeakers
      .map((ss) => ({
        session_id: sessionMap.get(ss.session_id),
        speaker_id: speakerMap.get(ss.speaker_id),
      }))
      .filter((ss) => ss.session_id && ss.speaker_id);
    if (mapped.length > 0) {
      await supabase.from("session_speakers").insert(mapped);
    }
  }

  // Clone custom_registration_fields
  const { data: customFields } = await supabase
    .from("custom_registration_fields")
    .select("label, field_key, type, required, options, placeholder, sort_order")
    .eq("event_id", eventId);
  if (customFields && customFields.length > 0) {
    await supabase
      .from("custom_registration_fields")
      .insert(customFields.map((f) => ({ ...f, event_id: newEventId })));
  }

  revalidatePath("/events");

  return { id: newEventId };
}
