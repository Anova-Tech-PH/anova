"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function uploadPhoto(eventId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const file = formData.get("file") as File;
  const caption = formData.get("caption") as string;
  const mediaType = file?.type?.startsWith("video/") ? "video" : "photo";

  if (!file) throw new Error("No file provided");

  // Upload to storage
  const fileName = `${user.id}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("attendee-photos")
    .upload(fileName, file);
  if (uploadError) throw uploadError;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("attendee-photos")
    .getPublicUrl(fileName);

  // Insert record
  const { error } = await supabase.from("event_photos").insert({
    event_id: eventId,
    user_id: user.id,
    image_url: urlData.publicUrl,
    media_type: mediaType,
    caption: caption || null,
  });
  if (error) throw error;

  revalidatePath("/");
}

export async function deletePhoto(photoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("event_photos")
    .delete()
    .eq("id", photoId);
  if (error) throw error;

  revalidatePath("/");
}

export async function togglePhotoLike(photoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("photo_likes")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("photo_id", photoId)
    .single();

  if (existing) {
    await supabase
      .from("photo_likes")
      .delete()
      .eq("user_id", user.id)
      .eq("photo_id", photoId);
  } else {
    await supabase.from("photo_likes").insert({
      user_id: user.id,
      photo_id: photoId,
    });
  }

  revalidatePath("/");
}
