import { createClient } from "@/shared/utils/supabase/server";

export async function getCheckInStats(eventId: string) {
  const supabase = await createClient();

  // Total registered (non-cancelled)
  const { count: totalRegistered } = await supabase
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .in("status", ["confirmed", "checked_in"]);

  // Unique attendees with at least one check-in
  const { data: uniqueCheckIns } = await supabase
    .from("check_ins")
    .select("registration_id")
    .eq("event_id", eventId);

  const uniqueAttendees = new Set(uniqueCheckIns?.map((c) => c.registration_id)).size;

  // Per-session stats
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, title, start_time, end_time")
    .eq("event_id", eventId)
    .eq("enable_check_in", true)
    .order("start_time", { ascending: true });

  const { data: allCheckIns } = await supabase
    .from("check_ins")
    .select("session_id")
    .eq("event_id", eventId);

  const countBySession: Record<string, number> = {};
  for (const ci of allCheckIns ?? []) {
    countBySession[ci.session_id] = (countBySession[ci.session_id] ?? 0) + 1;
  }

  const perSession = (sessions ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    start_time: s.start_time,
    end_time: s.end_time,
    checked_in_count: countBySession[s.id] ?? 0,
  }));

  return {
    totalRegistered: totalRegistered ?? 0,
    uniqueAttendees,
    perSession,
  };
}

export async function getRegistrationsByEvent(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("registrations")
    .select("*, ticket_types(name, type, price)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getRegistrationStats(eventId: string) {
  const supabase = await createClient();

  const { data: registrations } = await supabase
    .from("registrations")
    .select("status")
    .eq("event_id", eventId);

  const stats = {
    total: registrations?.length ?? 0,
    confirmed: 0,
    checked_in: 0,
    cancelled: 0,
  };

  for (const r of registrations ?? []) {
    if (r.status === "confirmed") stats.confirmed++;
    if (r.status === "checked_in") stats.checked_in++;
    if (r.status === "cancelled") stats.cancelled++;
  }

  return stats;
}
