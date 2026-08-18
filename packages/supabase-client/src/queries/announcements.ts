import type { SupabaseClient } from "@supabase/supabase-js";

export async function getAnnouncementsForAttendee(client: SupabaseClient, eventId: string) {
  const { data, error } = await client
    .from("announcements")
    .select("*")
    .eq("event_id", eventId)
    .eq("status", "sent")
    .order("sent_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function getUnreadAnnouncementCount(
  client: SupabaseClient,
  eventId: string,
  userId: string
) {
  const { data: announcements } = await client
    .from("announcements")
    .select("id")
    .eq("event_id", eventId)
    .eq("status", "sent");

  if (!announcements || announcements.length === 0) return 0;

  const { data: reads } = await client
    .from("announcement_reads")
    .select("announcement_id")
    .eq("user_id", userId);

  const readIds = new Set(
    (reads ?? []).map((r: { announcement_id: string }) => r.announcement_id)
  );
  return announcements.filter((a: { id: string }) => !readIds.has(a.id)).length;
}
