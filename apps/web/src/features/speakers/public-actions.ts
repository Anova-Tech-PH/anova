"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleSpeakerBookmark(eventId: string, speakerId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: existing } = await supabase
    .from("speaker_bookmarks")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("speaker_id", speakerId)
    .single();

  if (existing) {
    await supabase
      .from("speaker_bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("speaker_id", speakerId);
  } else {
    const { error } = await supabase
      .from("speaker_bookmarks")
      .insert({ user_id: user.id, speaker_id: speakerId, event_id: eventId });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/", "layout");
  return { bookmarked: !existing };
}

export async function saveSpeakerNote(speakerId: string, content: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("speaker_notes").upsert(
    {
      speaker_id: speakerId,
      user_id: user.id,
      content,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "speaker_id,user_id" }
  );
  if (error) throw error;
  revalidatePath("/", "layout");
}
