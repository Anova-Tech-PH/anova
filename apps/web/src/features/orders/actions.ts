"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { revalidatePath } from "next/cache";

export async function issueRefund(data: {
  orderId: string;
  amount: number; // cents
  reason?: string;
  eventId: string;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Get order with event info
  const { data: order } = await supabase
    .from("orders")
    .select(
      "*, registrations(id, event_id), events:event_id(organization_id, stripe_account_id, organizations(stripe_account_id))",
    )
    .eq("id", data.orderId)
    .single();

  if (!order) throw new Error("Order not found");
  if (!order.stripe_payment_intent_id) throw new Error("No payment to refund");

  const refundable = order.amount_total - order.amount_refunded;
  if (data.amount > refundable)
    throw new Error(
      `Maximum refundable amount is $${(refundable / 100).toFixed(2)}`,
    );
  if (data.amount <= 0) throw new Error("Refund amount must be positive");

  // Get Stripe account
  const stripeAccountId =
    (order as any).events?.stripe_account_id ||
    (order as any).events?.organizations?.stripe_account_id;

  // Issue refund via Stripe
  const refund = await stripe.refunds.create(
    {
      payment_intent: order.stripe_payment_intent_id,
      amount: data.amount,
    },
    stripeAccountId ? { stripeAccount: stripeAccountId } : undefined,
  );

  // Record refund in our DB using service role client
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  await adminSupabase.from("order_refunds").insert({
    order_id: data.orderId,
    stripe_refund_id: refund.id,
    amount: data.amount,
    reason: data.reason || null,
    refunded_by: user.id,
  });

  // Update order totals
  const newAmountRefunded = order.amount_refunded + data.amount;
  const isFullRefund = newAmountRefunded >= order.amount_total;

  await adminSupabase
    .from("orders")
    .update({
      amount_refunded: newAmountRefunded,
      status: isFullRefund ? "refunded" : "partially_refunded",
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.orderId);

  // Cancel registration if fully refunded
  if (isFullRefund && order.registrations) {
    await adminSupabase
      .from("registrations")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", (order.registrations as any).id);
  }

  revalidatePath(`/events/${data.eventId}/orders`);
}
