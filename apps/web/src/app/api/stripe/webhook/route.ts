import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import { sendRegistrationConfirmationEmail } from "@/features/emails/actions";
import type Stripe from "stripe";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { registration_id, order_id, event_id } = session.metadata ?? {};
  if (!registration_id || !order_id || !event_id) {
    console.error("[Stripe Webhook] Missing metadata on checkout.session.completed", session.id);
    return;
  }

  // Update order status to completed
  const { error: orderError } = await supabase
    .from("orders")
    .update({
      status: "completed",
      stripe_payment_intent_id: session.payment_intent as string,
    })
    .eq("id", order_id);

  if (orderError) {
    console.error("[Stripe Webhook] Failed to update order:", orderError);
  }

  // Update registration status to confirmed
  const { error: regError } = await supabase
    .from("registrations")
    .update({ status: "confirmed" })
    .eq("id", registration_id);

  if (regError) {
    console.error("[Stripe Webhook] Failed to update registration:", regError);
  }

  // Fetch registration details for confirmation email
  const { data: registration } = await supabase
    .from("registrations")
    .select("name, email, qr_code, ticket_types(name)")
    .eq("id", registration_id)
    .single();

  if (registration) {
    const ticketType = Array.isArray(registration.ticket_types)
      ? registration.ticket_types[0]
      : registration.ticket_types;

    // Fire-and-forget confirmation email
    sendRegistrationConfirmationEmail(event_id, {
      name: registration.name,
      email: registration.email,
      ticketTypeName: ticketType?.name ?? "General",
      qrCode: registration.qr_code,
    }).catch((err) =>
      console.error("[Stripe Webhook] Failed to send confirmation email:", err)
    );
  }

  // Fire-and-forget: mark registration_intents as converted
  supabase
    .from("registration_intents")
    .update({ status: "converted" })
    .eq("event_id", event_id)
    .eq("email", registration?.email ?? "")
    .then(({ error }) => {
      if (error) {
        console.error("[Stripe Webhook] Failed to update registration_intents:", error);
      }
    });
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const { registration_id, order_id } = session.metadata ?? {};
  if (!registration_id || !order_id) {
    console.error("[Stripe Webhook] Missing metadata on checkout.session.expired", session.id);
    return;
  }

  // Delete the pending order
  const { error: orderError } = await supabase
    .from("orders")
    .delete()
    .eq("id", order_id);

  if (orderError) {
    console.error("[Stripe Webhook] Failed to delete pending order:", orderError);
  }

  // Delete the pending registration (only if still pending)
  const { error: regError } = await supabase
    .from("registrations")
    .delete()
    .eq("id", registration_id)
    .eq("status", "pending");

  if (regError) {
    console.error("[Stripe Webhook] Failed to delete pending registration:", regError);
  }
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId = charge.payment_intent as string;
  if (!paymentIntentId) {
    console.error("[Stripe Webhook] No payment_intent on charge.refunded event");
    return;
  }

  // Look up order by stripe_payment_intent_id
  const { data: order, error: lookupError } = await supabase
    .from("orders")
    .select("id, amount_total, registration_id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .single();

  if (lookupError || !order) {
    console.error("[Stripe Webhook] Order not found for payment_intent:", paymentIntentId, lookupError);
    return;
  }

  const isFullyRefunded = charge.amount_refunded >= charge.amount;
  const newStatus = isFullyRefunded ? "refunded" : "partially_refunded";

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      amount_refunded: charge.amount_refunded,
      status: newStatus,
    })
    .eq("id", order.id);

  if (updateError) {
    console.error("[Stripe Webhook] Failed to update order refund:", updateError);
  }

  // If fully refunded, cancel the registration
  if (isFullyRefunded && order.registration_id) {
    const { error: regError } = await supabase
      .from("registrations")
      .update({ status: "cancelled" })
      .eq("id", order.registration_id);

    if (regError) {
      console.error("[Stripe Webhook] Failed to cancel registration:", regError);
    }
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Stripe Webhook] Signature verification failed:", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "checkout.session.expired":
        await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
        break;
      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      default:
        // Unhandled event type — acknowledge silently
        break;
    }
  } catch (err) {
    console.error("[Stripe Webhook] Error handling event:", event.type, err);
    // Still return 200 to prevent Stripe from retrying
  }

  return NextResponse.json({ received: true });
}
