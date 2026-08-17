import { createClient } from "@attendly/ui/supabase/server";

export type SessionRsvp = {
  id: string;
  session_id: string;
  user_id: string;
  status: "confirmed" | "waitlisted" | "cancelled";
  waitlist_position: number | null;
  created_at: string;
  updated_at: string;
};

export type RsvpSummary = {
  session_id: string;
  title: string;
  start_time: string;
  capacity: number | null;
  rsvp_enabled: boolean;
  confirmed_count: number;
  waitlisted_count: number;
};

export async function getSessionRsvpSummaries(eventId: string): Promise<RsvpSummary[]> {
  const supabase = await createClient();

  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("id, title, start_time, capacity, rsvp_enabled")
    .eq("event_id", eventId)
    .order("start_time", { ascending: true });

  if (error) throw new Error(error.message);
  if (!sessions || sessions.length === 0) return [];

  const sessionIds = sessions.map((s) => s.id);

  // Fetch all RSVPs in one query instead of N+1
  const { data: rsvps } = await supabase
    .from("session_rsvps")
    .select("session_id, status")
    .in("session_id", sessionIds)
    .in("status", ["confirmed", "waitlisted"]);

  const countMap: Record<string, { confirmed: number; waitlisted: number }> = {};
  for (const r of rsvps ?? []) {
    if (!countMap[r.session_id]) countMap[r.session_id] = { confirmed: 0, waitlisted: 0 };
    if (r.status === "confirmed") countMap[r.session_id].confirmed++;
    else if (r.status === "waitlisted") countMap[r.session_id].waitlisted++;
  }

  return sessions.map((session) => ({
    session_id: session.id,
    title: session.title,
    start_time: session.start_time,
    capacity: session.capacity,
    rsvp_enabled: session.rsvp_enabled,
    confirmed_count: countMap[session.id]?.confirmed ?? 0,
    waitlisted_count: countMap[session.id]?.waitlisted ?? 0,
  }));
}

export async function getSessionRsvpAttendees(sessionId: string): Promise<(SessionRsvp & { name?: string; email?: string })[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("session_rsvps")
    .select("*, profiles:user_id(full_name)")
    .eq("session_id", sessionId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => {
    const profiles = r.profiles as unknown as { full_name: string }[] | { full_name: string } | null;
    const name = Array.isArray(profiles) ? profiles[0]?.full_name : profiles?.full_name;
    return {
      ...r,
      name: name ?? undefined,
    };
  }) as (SessionRsvp & { name?: string })[];
}

export async function getUserRsvps(eventId: string): Promise<SessionRsvp[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id")
    .eq("event_id", eventId);

  if (!sessions || sessions.length === 0) return [];

  const sessionIds = sessions.map((s) => s.id);

  const { data, error } = await supabase
    .from("session_rsvps")
    .select("*")
    .eq("user_id", user.id)
    .in("session_id", sessionIds)
    .neq("status", "cancelled");

  if (error) throw new Error(error.message);
  return (data ?? []) as SessionRsvp[];
}

export async function getSessionRsvpStatus(sessionId: string): Promise<{ status: string | null; confirmedCount: number; capacity: number | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userStatus: string | null = null;
  if (user) {
    const { data } = await supabase
      .from("session_rsvps")
      .select("status")
      .eq("session_id", sessionId)
      .eq("user_id", user.id)
      .neq("status", "cancelled")
      .single();
    userStatus = data?.status ?? null;
  }

  const { count } = await supabase
    .from("session_rsvps")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("status", "confirmed");

  const { data: session } = await supabase
    .from("sessions")
    .select("capacity")
    .eq("id", sessionId)
    .single();

  return {
    status: userStatus,
    confirmedCount: count ?? 0,
    capacity: session?.capacity ?? null,
  };
}
