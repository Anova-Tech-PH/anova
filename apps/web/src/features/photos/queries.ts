"use server";

import { createClient } from "@attendly/ui/supabase/server";

export async function getPhotos(
  eventId: string,
  options: {
    tab?: "all" | "photos" | "videos";
    page?: number;
    pageSize?: number;
  } = {}
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { tab = "all", page = 1, pageSize = 20 } = options;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("event_photos")
    .select(
      "id, event_id, user_id, image_url, media_type, caption, likes_count, created_at, attendee_profiles!inner(display_name, avatar_url)",
      { count: "exact" }
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (tab === "photos") query = query.eq("media_type", "photo");
  if (tab === "videos") query = query.eq("media_type", "video");

  const { data, count, error } = await query;
  if (error) throw error;

  // Check which photos user has liked
  let likedPhotoIds: Set<string> = new Set();
  if (user) {
    const { data: likes } = await supabase
      .from("photo_likes")
      .select("photo_id")
      .eq("user_id", user.id);
    likedPhotoIds = new Set(likes?.map((l) => l.photo_id) ?? []);
  }

  return {
    photos: (data ?? []).map((p) => ({
      ...p,
      is_liked: likedPhotoIds.has(p.id),
      author: (p as Record<string, unknown>).attendee_profiles,
    })),
    total: count ?? 0,
  };
}

export async function getPhotoCount(eventId: string) {
  const supabase = await createClient();

  const [
    { count: totalCount },
    { count: photoCount },
    { count: videoCount },
  ] = await Promise.all([
    supabase
      .from("event_photos")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId),
    supabase
      .from("event_photos")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("media_type", "photo"),
    supabase
      .from("event_photos")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("media_type", "video"),
  ]);

  return {
    total: totalCount ?? 0,
    photos: photoCount ?? 0,
    videos: videoCount ?? 0,
  };
}
