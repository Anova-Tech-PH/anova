import { SupabaseClient } from "@supabase/supabase-js";

export async function updateProfileMutation(
  client: SupabaseClient,
  userId: string,
  data: {
    full_name: string;
    avatar_url?: string;
    bio?: string;
    company?: string;
    job_title?: string;
    interests?: string[];
    looking_for?: string[];
    linkedin_url?: string;
    twitter_handle?: string;
  },
) {
  const { error } = await client
    .from("profiles")
    .update({
      full_name: data.full_name,
      avatar_url: data.avatar_url || null,
      bio: data.bio || null,
      company: data.company || null,
      job_title: data.job_title || null,
      interests: data.interests ?? [],
      looking_for: data.looking_for ?? [],
      linkedin_url: data.linkedin_url || null,
      twitter_handle: data.twitter_handle || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

export async function updateAttendeeContactInfo(
  client: SupabaseClient,
  userId: string,
  eventId: string,
  data: {
    phone?: string;
    contact_email?: string;
    address?: string;
    show_phone?: boolean;
    show_email?: boolean;
    show_address?: boolean;
  },
) {
  const { error } = await client
    .from("attendee_profiles")
    .update({
      phone: data.phone || null,
      contact_email: data.contact_email || null,
      address: data.address || null,
      show_phone: data.show_phone ?? false,
      show_email: data.show_email ?? false,
      show_address: data.show_address ?? false,
    })
    .eq("id", userId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
}
