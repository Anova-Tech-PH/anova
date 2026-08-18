import type { SupabaseClient } from "@supabase/supabase-js";

export async function getAttendeeBookmarkIds(
  client: SupabaseClient,
  userId: string,
  eventId: string,
): Promise<string[]> {
  const { data } = await client
    .from("attendee_bookmarks")
    .select("bookmarked_user_id")
    .eq("user_id", userId)
    .eq("event_id", eventId);

  return data?.map((b: any) => b.bookmarked_user_id) ?? [];
}

export async function getAttendeeNote(
  client: SupabaseClient,
  userId: string,
  targetUserId: string,
): Promise<string> {
  const { data } = await client
    .from("attendee_notes")
    .select("content")
    .eq("user_id", userId)
    .eq("target_user_id", targetUserId)
    .maybeSingle();

  return data?.content ?? "";
}

export async function getAttendeeProfileFull(
  client: SupabaseClient,
  userId: string,
  eventId: string,
) {
  // Try attendee_profiles first (per-event profile)
  const { data: attendeeProfile } = await client
    .from("attendee_profiles")
    .select("*")
    .eq("id", userId)
    .eq("event_id", eventId)
    .single();

  // Also get the base profile
  const { data: baseProfile } = await client
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  // Get interests
  const { data: interests } = await client
    .from("attendee_interests")
    .select("interest_id, event_interests(id, name)")
    .eq("user_id", userId);

  const interestList = interests?.map((i: any) => i.event_interests).filter(Boolean) ?? [];

  // Merge: attendee_profiles fields override base profile
  if (attendeeProfile) {
    return {
      id: userId,
      full_name: attendeeProfile.display_name ?? baseProfile?.full_name ?? "",
      avatar_url: attendeeProfile.avatar_url ?? baseProfile?.avatar_url ?? null,
      title: attendeeProfile.title ?? baseProfile?.title ?? null,
      company: attendeeProfile.company ?? baseProfile?.company ?? null,
      location: attendeeProfile.location ?? null,
      bio: attendeeProfile.bio ?? baseProfile?.bio ?? null,
      links: attendeeProfile.links ?? null,
      interests: interestList,
    };
  }

  return {
    id: userId,
    full_name: baseProfile?.full_name ?? "",
    avatar_url: baseProfile?.avatar_url ?? null,
    title: baseProfile?.title ?? null,
    company: baseProfile?.company ?? null,
    location: null,
    bio: baseProfile?.bio ?? null,
    links: null,
    interests: interestList,
  };
}
