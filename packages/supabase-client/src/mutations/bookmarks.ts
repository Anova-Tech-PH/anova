import type { SupabaseClient } from "@supabase/supabase-js";

export async function toggleSessionBookmark(
  client: SupabaseClient,
  sessionId: string,
  userId: string,
): Promise<{ bookmarked: boolean }> {
  const { data: existing } = await client
    .from("session_bookmarks")
    .select("user_id")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .single();

  if (existing) {
    await client
      .from("session_bookmarks")
      .delete()
      .eq("user_id", userId)
      .eq("session_id", sessionId);
    return { bookmarked: false };
  } else {
    const { error } = await client
      .from("session_bookmarks")
      .insert({ user_id: userId, session_id: sessionId });
    if (error) throw new Error(error.message);
    return { bookmarked: true };
  }
}

export async function toggleSpeakerBookmark(
  client: SupabaseClient,
  userId: string,
  speakerId: string,
  eventId: string,
): Promise<{ bookmarked: boolean }> {
  const { data: existing } = await client
    .from("speaker_bookmarks")
    .select("user_id")
    .eq("user_id", userId)
    .eq("speaker_id", speakerId)
    .single();

  if (existing) {
    await client
      .from("speaker_bookmarks")
      .delete()
      .eq("user_id", userId)
      .eq("speaker_id", speakerId);
    return { bookmarked: false };
  } else {
    const { error } = await client
      .from("speaker_bookmarks")
      .insert({ user_id: userId, speaker_id: speakerId, event_id: eventId });
    if (error) throw new Error(error.message);
    return { bookmarked: true };
  }
}

export async function getUserSpeakerBookmarks(
  client: SupabaseClient,
  userId: string,
  eventId: string,
): Promise<string[]> {
  const { data } = await client
    .from("speaker_bookmarks")
    .select("speaker_id")
    .eq("user_id", userId)
    .eq("event_id", eventId);

  return (data ?? []).map((b: any) => b.speaker_id as string);
}

export async function saveSpeakerNote(
  client: SupabaseClient,
  userId: string,
  speakerId: string,
  content: string,
) {
  const { error } = await client.from("speaker_notes").upsert(
    {
      speaker_id: speakerId,
      user_id: userId,
      content,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "speaker_id,user_id" },
  );
  if (error) throw new Error(error.message);
}

export async function getSpeakerNote(
  client: SupabaseClient,
  userId: string,
  speakerId: string,
): Promise<string> {
  const { data } = await client
    .from("speaker_notes")
    .select("content")
    .eq("user_id", userId)
    .eq("speaker_id", speakerId)
    .single();

  return (data as any)?.content ?? "";
}
