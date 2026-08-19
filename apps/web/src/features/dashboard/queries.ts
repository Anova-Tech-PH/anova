import { createClient } from "@attendly/ui/supabase/server";

export async function getDashboardStats(orgId: string) {
  const supabase = await createClient();

  // Get all events for this org
  const { data: events } = await supabase
    .from("events")
    .select("id, title, slug, status, start_date, end_date, cover_image, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  const allEvents = events ?? [];
  const eventIds = allEvents.map((e) => e.id);

  // Get all registrations
  const { data: registrations } = eventIds.length
    ? await supabase
        .from("registrations")
        .select("id, status, event_id")
        .in("event_id", eventIds)
    : { data: [] };

  const allRegs = registrations ?? [];
  const activeRegs = allRegs.filter((r) => r.status !== "cancelled");
  const checkedIn = allRegs.filter((r) => r.status === "checked_in");

  const now = new Date().toISOString();
  const upcoming = allEvents.filter((e) => e.start_date > now && e.status !== "cancelled");

  // Per-event registration counts for recent events
  const regCountMap: Record<string, number> = {};
  for (const r of activeRegs) {
    regCountMap[r.event_id] = (regCountMap[r.event_id] ?? 0) + 1;
  }

  const recentEvents = allEvents.slice(0, 5).map((e) => ({
    ...e,
    registrations_count: regCountMap[e.id] ?? 0,
  }));

  return {
    totalEvents: allEvents.length,
    totalRegistrations: activeRegs.length,
    upcomingEvents: upcoming.length,
    checkInRate: activeRegs.length > 0
      ? Math.round((checkedIn.length / activeRegs.length) * 100)
      : 0,
    recentEvents,
  };
}
