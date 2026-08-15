"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(
  eventId: string,
  data: {
    display_name: string;
    avatar_url?: string;
    title?: string;
    company?: string;
    location?: string;
    bio?: string;
    is_visible_in_directory?: boolean;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("attendee_profiles")
    .upsert({
      id: user.id,
      event_id: eventId,
      display_name: data.display_name,
      avatar_url: data.avatar_url ?? null,
      title: data.title ?? null,
      company: data.company ?? null,
      location: data.location ?? null,
      bio: data.bio ?? null,
      is_visible_in_directory: data.is_visible_in_directory ?? true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id,event_id" });

  if (error) throw error;
  revalidatePath("/");
}

export async function toggleAttendeeBookmark(eventId: string, targetUserId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check if already bookmarked
  const { data: existing } = await supabase
    .from("attendee_bookmarks")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("bookmarked_user_id", targetUserId)
    .eq("event_id", eventId)
    .single();

  if (existing) {
    await supabase
      .from("attendee_bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("bookmarked_user_id", targetUserId)
      .eq("event_id", eventId);
  } else {
    await supabase
      .from("attendee_bookmarks")
      .insert({
        user_id: user.id,
        bookmarked_user_id: targetUserId,
        event_id: eventId,
      });
  }

  revalidatePath("/");
}

export async function saveAttendeeNote(targetUserId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("attendee_notes")
    .upsert(
      {
        target_user_id: targetUserId,
        user_id: user.id,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "target_user_id,user_id" }
    );

  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function updateProfileInterests(eventId: string, interestIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Delete existing interests
  await supabase
    .from("attendee_interests")
    .delete()
    .eq("user_id", user.id);

  // Insert new ones
  if (interestIds.length > 0) {
    await supabase
      .from("attendee_interests")
      .insert(interestIds.map(id => ({ user_id: user.id, interest_id: id })));
  }

  revalidatePath("/");
}
