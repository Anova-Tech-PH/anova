import type { SupabaseClient } from "@supabase/supabase-js";

export async function getPhotos(
  client: SupabaseClient,
  eventId: string,
  options?: { tab?: string; page?: number; pageSize?: number },
  userId?: string
) {
  const { tab = "all", page = 1, pageSize = 20 } = options ?? {};
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = client
    .from("event_photos")
    .select(
      "id, event_id, user_id, image_url, media_type, caption, likes_count, created_at",
      { count: "exact" }
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (tab === "photos") query = query.eq("media_type", "photo");
  if (tab === "videos") query = query.eq("media_type", "video");

  const { data, count, error } = await query;
  if (error) throw error;

  // Fetch author profiles
  const userIds = [...new Set((data ?? []).map((p: { user_id: string }) => p.user_id))];
  let profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
  if (userIds.length > 0) {
    const { data: profiles } = await client
      .from("attendee_profiles")
      .select("id, display_name, avatar_url")
      .eq("event_id", eventId)
      .in("id", userIds);
    for (const p of (profiles ?? []) as { id: string; display_name: string | null; avatar_url: string | null }[]) {
      profileMap.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url });
    }
  }

  // Check liked photos
  let likedPhotoIds: Set<string> = new Set();
  if (userId) {
    const { data: likes } = await client
      .from("photo_likes")
      .select("photo_id")
      .eq("user_id", userId);
    likedPhotoIds = new Set(
      (likes ?? []).map((l: { photo_id: string }) => l.photo_id)
    );
  }

  return {
    photos: (data ?? []).map((p: { id: string; user_id: string }) => ({
      ...p,
      is_liked: likedPhotoIds.has(p.id),
      author: profileMap.get(p.user_id) ?? { display_name: null, avatar_url: null },
    })),
    total: count ?? 0,
  };
}

export async function getPhotoDetail(
  client: SupabaseClient,
  photoId: string,
  userId?: string
) {
  const { data: photo, error } = await client
    .from("event_photos")
    .select("id, event_id, user_id, image_url, media_type, caption, likes_count, created_at")
    .eq("id", photoId)
    .single();

  if (error) throw error;
  if (!photo) return null;

  // Fetch author profile
  const { data: profile } = await client
    .from("attendee_profiles")
    .select("id, display_name, avatar_url")
    .eq("event_id", (photo as any).event_id)
    .eq("id", (photo as any).user_id)
    .single();

  // Check if liked by current user
  let isLiked = false;
  if (userId) {
    const { data: like } = await client
      .from("photo_likes")
      .select("id")
      .eq("photo_id", photoId)
      .eq("user_id", userId)
      .single();
    isLiked = !!like;
  }

  return {
    ...photo,
    is_liked: isLiked,
    author: profile
      ? { display_name: profile.display_name, avatar_url: profile.avatar_url }
      : { display_name: null, avatar_url: null },
  };
}

export async function getPhotoComments(client: SupabaseClient, photoId: string) {
  const { data: comments } = await client
    .from("photo_comments")
    .select("id, content, created_at, user_id")
    .eq("photo_id", photoId)
    .order("created_at", { ascending: true });

  if (!comments || comments.length === 0) return [];

  const { data: photo } = await client
    .from("event_photos")
    .select("event_id")
    .eq("id", photoId)
    .single();

  if (!photo) return comments;

  const userIds = [...new Set(comments.map((c: { user_id: string }) => c.user_id))];
  const { data: profiles } = await client
    .from("attendee_profiles")
    .select("id, display_name")
    .eq("event_id", (photo as { event_id: string }).event_id)
    .in("id", userIds);

  const nameMap = new Map(
    ((profiles ?? []) as { id: string; display_name: string | null }[]).map(
      (p) => [p.id, p.display_name]
    )
  );

  return comments.map((c: { id: string; user_id: string }) => ({
    ...c,
    author_name: nameMap.get(c.user_id) ?? "Attendee",
  }));
}
