import { createClient } from "@attendly/ui/supabase/server";

export async function getEventRevenue(eventId: string) {
  const supabase = await createClient();

  // Get ticket types for this event
  const { data: tickets } = await supabase
    .from("ticket_types")
    .select("id, name, type, price")
    .eq("event_id", eventId);

  // Get all confirmed/checked_in registrations
  const { data: registrations } = await supabase
    .from("registrations")
    .select("ticket_type_id, discount_amount, created_at, status")
    .eq("event_id", eventId)
    .in("status", ["confirmed", "checked_in"]);

  const ticketMap = new Map(tickets?.map((t) => [t.id, t]) ?? []);

  // Revenue by ticket type
  const revenueByType: { name: string; revenue: number; count: number; price: number }[] = [];
  const dailyRevenue: Record<string, number> = {};
  let totalRevenue = 0;
  let totalPaidRegistrations = 0;
  let totalFreeRegistrations = 0;

  for (const reg of registrations ?? []) {
    const ticket = ticketMap.get(reg.ticket_type_id);
    if (!ticket) continue;

    if (ticket.type === "paid") {
      const revenue = ticket.price - (reg.discount_amount ?? 0);
      totalRevenue += revenue;
      totalPaidRegistrations++;

      // Accumulate by ticket type
      let entry = revenueByType.find((r) => r.name === ticket.name);
      if (!entry) {
        entry = { name: ticket.name, revenue: 0, count: 0, price: ticket.price };
        revenueByType.push(entry);
      }
      entry.revenue += revenue;
      entry.count++;

      // Accumulate daily
      const day = new Date(reg.created_at).toISOString().split("T")[0];
      dailyRevenue[day] = (dailyRevenue[day] ?? 0) + revenue;
    } else {
      totalFreeRegistrations++;
    }
  }

  // Convert daily to sorted array
  const dailyData = Object.entries(dailyRevenue)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));

  const hasPaidTickets = tickets?.some((t) => t.type === "paid") ?? false;

  return {
    totalRevenue,
    totalPaidRegistrations,
    totalFreeRegistrations,
    averageTicketPrice: totalPaidRegistrations > 0 ? totalRevenue / totalPaidRegistrations : 0,
    revenueByType,
    dailyRevenue: dailyData,
    hasPaidTickets,
  };
}
