import { createClient } from "@attendly/ui/supabase/server";

export type OrderRow = {
  id: string;
  customer_name: string;
  customer_email: string;
  amount_total: number;
  amount_discount: number;
  amount_refunded: number;
  currency: string;
  status: string;
  created_at: string;
  stripe_payment_intent_id: string | null;
  ticket_name: string;
};

export async function getOrders(eventId: string): Promise<OrderRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*, registrations!registration_id(ticket_types(name))")
    .eq("event_id", eventId)
    .neq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((o) => ({
    id: o.id,
    customer_name: o.customer_name,
    customer_email: o.customer_email,
    amount_total: o.amount_total,
    amount_discount: o.amount_discount,
    amount_refunded: o.amount_refunded,
    currency: o.currency,
    status: o.status,
    created_at: o.created_at,
    stripe_payment_intent_id: o.stripe_payment_intent_id,
    ticket_name:
      (o.registrations as { ticket_types: { name: string } | null } | null)
        ?.ticket_types?.name ?? "Unknown",
  }));
}

export async function getOrderSummary(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select("amount_total, amount_refunded, status")
    .eq("event_id", eventId)
    .neq("status", "pending");

  if (error) throw new Error(error.message);

  const orders = data ?? [];
  const gross = orders.reduce((sum, o) => sum + o.amount_total, 0);
  const refunded = orders.reduce((sum, o) => sum + o.amount_refunded, 0);
  const net = gross - refunded;
  const totalSold = orders.filter((o) => o.status !== "refunded").length;
  const totalRefunded = orders.filter((o) => o.status === "refunded").length;

  return { gross, net, refunded, totalSold, totalRefunded };
}
