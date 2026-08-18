import type { SupabaseClient } from "@supabase/supabase-js";

export async function togglePhotoLike(
  client: SupabaseClient,
  photoId: string,
  userId: string,
): Promise<{ liked: boolean }> {
  const { data: existing } = await client
    .from("photo_likes")
    .select("id")
    .eq("photo_id", photoId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    await client
      .from("photo_likes")
      .delete()
      .eq("photo_id", photoId)
      .eq("user_id", userId);
    // Decrement likes_count
    await client.rpc("decrement_photo_likes", { _photo_id: photoId });
    return { liked: false };
  } else {
    const { error } = await client
      .from("photo_likes")
      .insert({ photo_id: photoId, user_id: userId });
    if (error) throw new Error(error.message);
    // Increment likes_count
    await client.rpc("increment_photo_likes", { _photo_id: photoId });
    return { liked: true };
  }
}

export async function uploadPhoto(
  client: SupabaseClient,
  params: {
    eventId: string;
    userId: string;
    imageUrl: string;
    caption?: string;
    mediaType?: "photo" | "video";
  },
): Promise<{ id: string }> {
  const { data, error } = await client
    .from("event_photos")
    .insert({
      event_id: params.eventId,
      user_id: params.userId,
      image_url: params.imageUrl,
      caption: params.caption ?? null,
      media_type: params.mediaType ?? "photo",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function addPhotoComment(
  client: SupabaseClient,
  params: { photoId: string; userId: string; content: string },
): Promise<{ id: string }> {
  const { data, error } = await client
    .from("photo_comments")
    .insert({
      photo_id: params.photoId,
      user_id: params.userId,
      content: params.content,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deletePhoto(
  client: SupabaseClient,
  photoId: string,
): Promise<void> {
  const { error } = await client
    .from("event_photos")
    .delete()
    .eq("id", photoId);

  if (error) throw new Error(error.message);
}
