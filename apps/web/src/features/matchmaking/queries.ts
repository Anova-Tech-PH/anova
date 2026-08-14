import { createClient } from "@attendly/ui/supabase/server";

export type EventInterest = {
  id: string;
  event_id: string;
  name: string;
  sort_order: number;
  attendee_count: number;
  created_at: string;
  updated_at: string;
};

export async function getEventInterests(eventId: string): Promise<{
  interests: EventInterest[];
  total: number;
  attendeesParticipating: number;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("event_interests")
    .select("*, attendee_interests(count)")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const interests = (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    attendee_count:
      (row.attendee_interests as { count: number }[])?.[0]?.count ?? 0,
    attendee_interests: undefined,
  })) as EventInterest[];

  // Count distinct attendees participating
  const { count } = await supabase
    .from("attendee_interests")
    .select("user_id", { count: "exact", head: true })
    .eq("event_id", eventId);

  return {
    interests,
    total: interests.length,
    attendeesParticipating: count ?? 0,
  };
}
