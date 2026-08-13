import { createClient } from "@attendly/ui/supabase/server";

export type Announcement = {
  id: string;
  event_id: string;
  author_id: string;
  subject: string;
  body: string;
  target_audience: {
    type: string;
    ticket_type_ids?: string[];
    category?: string;
    session_id?: string;
    attendee_ids?: string[];
    excluded_categories?: string[];
  };
  channels: string[];
  status: "draft" | "scheduled" | "sent";
  scheduled_for: string | null;
  sent_at: string | null;
  read_count: number;
  sender_name: string | null;
  reply_to_email: string | null;
  signature: string | null;
  created_at: string;
  updated_at: string;
};

export type AnnouncementTemplate = {
  id: string;
  organization_id: string;
  event_id: string | null;
  name: string;
  subject: string;
  body: string;
  type: "quick_reminder" | "custom";
  created_at: string;
};

export async function getAnnouncements(
  eventId: string,
  opts?: { page?: number; pageSize?: number }
): Promise<{
  drafts: Announcement[];
  sent: Announcement[];
  totalDrafts: number;
  totalSent: number;
}> {
  const supabase = await createClient();
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const [draftsResult, sentResult, draftsCount, sentCount] = await Promise.all([
    supabase
      .from("announcements")
      .select("*")
      .eq("event_id", eventId)
      .eq("status", "draft")
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("announcements")
      .select("*")
      .eq("event_id", eventId)
      .eq("status", "sent")
      .order("sent_at", { ascending: false })
      .range(from, to),
    supabase
      .from("announcements")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "draft"),
    supabase
      .from("announcements")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "sent"),
  ]);

  return {
    drafts: (draftsResult.data ?? []) as Announcement[],
    sent: (sentResult.data ?? []) as Announcement[],
    totalDrafts: draftsCount.count ?? 0,
    totalSent: sentCount.count ?? 0,
  };
}

export async function getAnnouncement(
  id: string
): Promise<Announcement | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Announcement;
}

export async function getAnnouncementsForAttendee(
  eventId: string
): Promise<Announcement[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("event_id", eventId)
    .eq("status", "sent")
    .order("sent_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as Announcement[];
}

export async function getUnreadCount(eventIds: string[]): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

export async function getRecipientCount(
  eventId: string,
  audience: {
    type: string;
    ticket_type_ids?: string[];
    category?: string;
    session_id?: string;
    attendee_ids?: string[];
    excluded_categories?: string[];
  }
): Promise<number> {
  if (audience.type === "manual") {
    return audience.attendee_ids?.length ?? 0;
  }

  const supabase = await createClient();

  if (audience.type === "session_attendees" && audience.session_id) {
    const { count } = await supabase
      .from("session_rsvps")
      .select("*", { count: "exact", head: true })
      .eq("session_id", audience.session_id)
      .eq("status", "confirmed");

    return count ?? 0;
  }

  // For 'all', 'ticket_type', 'category', etc. — count registrations
  let query = supabase
    .from("registrations")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  if (
    audience.type === "ticket_type" &&
    audience.ticket_type_ids &&
    audience.ticket_type_ids.length > 0
  ) {
    query = query.in("ticket_type_id", audience.ticket_type_ids);
  }

  if (audience.type === "category" && audience.category) {
    query = query.eq("category", audience.category);
  }

  if (
    audience.excluded_categories &&
    audience.excluded_categories.length > 0
  ) {
    for (const cat of audience.excluded_categories) {
      query = query.neq("category", cat);
    }
  }

  const { count } = await query;
  return count ?? 0;
}

export async function getTemplates(
  organizationId: string,
  eventId: string
): Promise<AnnouncementTemplate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcement_templates")
    .select("*")
    .eq("organization_id", organizationId)
    .or(`event_id.eq.${eventId},event_id.is.null`)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as AnnouncementTemplate[];
}

export async function getOrgTemplates(
  organizationId: string,
  currentEventId: string
): Promise<AnnouncementTemplate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcement_templates")
    .select("*")
    .eq("organization_id", organizationId)
    .not("event_id", "is", null)
    .neq("event_id", currentEventId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as AnnouncementTemplate[];
}
