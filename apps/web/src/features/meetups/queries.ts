import { createClient } from "@attendly/ui/supabase/server";

export type Meetup = {
  id: string;
  event_id: string;
  created_by: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  capacity: number | null;
  status: "active" | "cancelled";
  created_at: string;
  updated_at: string;
  rsvp_count?: number;
};

export async function getMeetups(
  eventId: string,
  opts?: { page?: number; pageSize?: number }
): Promise<{ meetups: Meetup[]; total: number }> {
  const supabase = await createClient();
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const [listResult, countResult] = await Promise.all([
    supabase
      .from("meetups")
      .select("*")
      .eq("event_id", eventId)
      .eq("status", "active")
      .order("starts_at", { ascending: true })
      .range(from, to),
    supabase
      .from("meetups")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "active"),
  ]);

  const meetups = (listResult.data ?? []) as Meetup[];

  if (meetups.length > 0) {
    const ids = meetups.map((m) => m.id);
    const { data: rsvpData } = await supabase
      .from("meetup_rsvps")
      .select("meetup_id")
      .in("meetup_id", ids)
      .eq("status", "confirmed");

    const countMap = new Map<string, number>();
    for (const r of rsvpData ?? []) {
      countMap.set(r.meetup_id, (countMap.get(r.meetup_id) ?? 0) + 1);
    }
    for (const m of meetups) {
      m.rsvp_count = countMap.get(m.id) ?? 0;
    }
  }

  return {
    meetups,
    total: countResult.count ?? 0,
  };
}

export async function getMeetup(id: string): Promise<Meetup | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("meetups")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Meetup;
}
