import type { SupabaseClient } from "@supabase/supabase-js";

export async function toggleAttendeeBookmark(
  client: SupabaseClient,
  userId: string,
  targetUserId: string,
  eventId: string,
): Promise<{ bookmarked: boolean }> {
  const { data: existing } = await client
    .from("attendee_bookmarks")
    .select("user_id")
    .eq("user_id", userId)
    .eq("bookmarked_user_id", targetUserId)
    .eq("event_id", eventId)
    .single();

  if (existing) {
    await client
      .from("attendee_bookmarks")
      .delete()
      .eq("user_id", userId)
      .eq("bookmarked_user_id", targetUserId)
      .eq("event_id", eventId);
    return { bookmarked: false };
  } else {
    const { error } = await client
      .from("attendee_bookmarks")
      .insert({ user_id: userId, bookmarked_user_id: targetUserId, event_id: eventId });
    if (error) throw new Error(error.message);
    return { bookmarked: true };
  }
}

export async function saveAttendeeNote(
  client: SupabaseClient,
  userId: string,
  targetUserId: string,
  content: string,
): Promise<void> {
  const { error } = await client
    .from("attendee_notes")
    .upsert(
      {
        target_user_id: targetUserId,
        user_id: userId,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "target_user_id,user_id" },
    );

  if (error) throw new Error(error.message);
}
