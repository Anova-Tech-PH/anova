import type { SupabaseClient } from "@supabase/supabase-js";

export async function submitContestEntry(
  client: SupabaseClient,
  params: {
    contestId: string;
    userId: string;
    imageUrl: string;
    caption?: string;
  },
): Promise<{ id: string }> {
  const { data, error } = await client
    .from("contest_entries")
    .insert({
      contest_id: params.contestId,
      user_id: params.userId,
      image_url: params.imageUrl,
      caption: params.caption ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function toggleContestLike(
  client: SupabaseClient,
  entryId: string,
  userId: string,
): Promise<{ liked: boolean }> {
  const { data: existing } = await client
    .from("contest_entry_likes")
    .select("id")
    .eq("entry_id", entryId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    await client
      .from("contest_entry_likes")
      .delete()
      .eq("entry_id", entryId)
      .eq("user_id", userId);
    return { liked: false };
  } else {
    const { error } = await client
      .from("contest_entry_likes")
      .insert({ entry_id: entryId, user_id: userId });
    if (error) throw new Error(error.message);
    return { liked: true };
  }
}
