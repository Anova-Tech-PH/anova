import type { SupabaseClient } from "@supabase/supabase-js";

export async function markAnnouncementRead(
  client: SupabaseClient,
  announcementId: string,
  userId: string,
): Promise<void> {
  const { error } = await client
    .from("announcement_reads")
    .upsert(
      { announcement_id: announcementId, user_id: userId },
      { onConflict: "announcement_id,user_id" },
    );
  if (error) throw new Error(error.message);
}
