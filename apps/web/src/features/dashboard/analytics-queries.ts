import { createClient } from "@/shared/utils/supabase/server";

export async function getEventAnalytics(eventId: string) {
  const supabase = await createClient();

  // All registrations
  const { data: registrations } = await supabase
    .from("registrations")
    .select("id, status, created_at, checked_in_at, ticket_type_id, ticket_types(name, type, price)")
    .eq("event_id", eventId)
    .order("created_at");

  const regs = registrations ?? [];

  // Stats
  const total = regs.length;
  const confirmed = regs.filter((r) => r.status === "confirmed").length;
  const checkedIn = regs.filter((r) => r.status === "checked_in").length;
  const cancelled = regs.filter((r) => r.status === "cancelled").length;
  const active = confirmed + checkedIn;
  const checkInRate = active > 0 ? Math.round((checkedIn / active) * 100) : 0;

  // Registration time series (group by date)
  const timeSeriesMap: Record<string, number> = {};
  for (const r of regs) {
    if (r.status === "cancelled") continue;
    const date = new Date(r.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    timeSeriesMap[date] = (timeSeriesMap[date] ?? 0) + 1;
  }

  // Cumulative
  let cumulative = 0;
  const timeSeries = Object.entries(timeSeriesMap).map(([date, count]) => {
    cumulative += count;
    return { date, registrations: count, cumulative };
  });

  // Ticket breakdown
  const ticketMap: Record<string, { name: string; count: number; revenue: number }> = {};
  for (const r of regs) {
    if (r.status === "cancelled") continue;
    const ticket = r.ticket_types as any;
    const name = ticket?.name ?? "Unknown";
    if (!ticketMap[name]) {
      ticketMap[name] = { name, count: 0, revenue: 0 };
    }
    ticketMap[name].count++;
    if (ticket?.type === "paid") {
      ticketMap[name].revenue += ticket.price ?? 0;
    }
  }

  const ticketBreakdown = Object.values(ticketMap);
  const totalRevenue = ticketBreakdown.reduce((sum, t) => sum + t.revenue, 0);

  return {
    stats: { total, confirmed, checkedIn, cancelled, active, checkInRate, totalRevenue },
    timeSeries,
    ticketBreakdown,
  };
}
