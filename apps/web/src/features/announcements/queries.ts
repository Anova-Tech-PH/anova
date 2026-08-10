import { createClient } from "@attendly/ui/supabase/server";

export type Announcement = {
  id: string;
  event_id: string;
  author_id: string;
  subject: string;
  body: string;
  target_audience: { type: string; ticket_type_ids?: string[] };
  channels: string[];
  status: "draft" | "scheduled" | "sent";
  scheduled_for: string | null;
  sent_at: string | null;
  read_count: number;
  created_at: string;
  updated_at: string;
};

export async function getAnnouncements(eventId: string): Promise<Announcement[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Announcement[];
}

export async function getAnnouncement(id: string): Promise<Announcement | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Announcement;
}

export async function getAnnouncementsForAttendee(eventId: string): Promise<Announcement[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("event_id", eventId)
    .eq("status", "sent")
    .order("sent_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Announcement[];
}

export async function getUnreadCount(eventIds: string[]): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id")
    .in("event_id", eventIds)
    .eq("status", "sent");

  if (!announcements || announcements.length === 0) return 0;

  const { data: reads } = await supabase
    .from("announcement_reads")
    .select("announcement_id")
    .eq("user_id", user.id);

  const readIds = new Set((reads ?? []).map((r) => r.announcement_id));
  return announcements.filter((a) => !readIds.has(a.id)).length;
}
