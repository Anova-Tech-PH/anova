"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function createMeetup(
  eventId: string,
  data: {
    title: string;
    description?: string;
    starts_at: string;
    ends_at?: string;
    location?: string;
    capacity?: number;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: meetup, error } = await supabase
    .from("meetups")
    .insert({
      event_id: eventId,
      created_by: user.id,
      title: data.title,
      description: data.description ?? null,
      starts_at: data.starts_at,
      ends_at: data.ends_at ?? null,
      location: data.location ?? null,
      capacity: data.capacity ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/meetups`);
  return meetup;
}

export async function updateMeetup(
  eventId: string,
  meetupId: string,
  data: {
    title?: string;
    description?: string;
    starts_at?: string;
    ends_at?: string;
    location?: string;
    capacity?: number;
  }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("meetups")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", meetupId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/meetups`);
}

export async function deleteMeetup(eventId: string, meetupId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("meetups")
    .delete()
    .eq("id", meetupId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/meetups`);
}

export async function rsvpToMeetup(meetupId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("rsvp_to_meetup", {
    _meetup_id: meetupId,
  });

  if (error) throw new Error(error.message);
  return data as string;
}

export async function cancelMeetupRsvp(meetupId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("cancel_meetup_rsvp", {
    _meetup_id: meetupId,
  });

  if (error) throw new Error(error.message);
}
