"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { stripe } from "@/lib/stripe";
import { nanoid } from "nanoid";

export async function createCheckoutSession(data: {
  event_id: string;
  ticket_type_id: string;
  name: string;
  email: string;
  custom_fields?: Record<string, unknown>;
  promo_code_id?: string;
  discount_amount?: number;
  origin: string;
  org_slug: string;
  event_slug: string;
}) {
  try {
    const supabase = await createClient();

    // 1. Get ticket info
    const { data: ticket, error: ticketError } = await supabase
      .from("ticket_types")
      .select("id, name, price, quantity")
      .eq("id", data.ticket_type_id)
      .single();

    if (ticketError || !ticket) {
      throw new Error("Ticket type not found");
    }

    // 2. Check ticket availability (include pending since they're in checkout)
    if (ticket.quantity) {
      const { count } = await supabase
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("ticket_type_id", data.ticket_type_id)
        .in("status", ["pending", "confirmed", "checked_in"]);

      if (count !== null && count >= ticket.quantity) {
        throw new Error("This ticket type is sold out");
      }
    }

    // 3. Check for duplicate registration
    const { data: existing } = await supabase
      .from("registrations")
      .select("id")
      .eq("event_id", data.event_id)
      .eq("email", data.email)
      .in("status", ["confirmed", "checked_in"])
      .single();

    if (existing) {
      throw new Error("This email is already registered for this event");
    }

    // 4. Validate and increment promo code if provided
    if (data.promo_code_id) {
      const { data: promo, error: promoError } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("id", data.promo_code_id)
        .eq("event_id", data.event_id)
        .single();

      if (promoError || !promo) throw new Error("Invalid promo code");
      if (!promo.active) throw new Error("This promo code is no longer active");

      const now = new Date();
      if (promo.starts_at && new Date(promo.starts_at) > now)
        throw new Error("Promo code not yet active");
      if (promo.expires_at && new Date(promo.expires_at) < now)
        throw new Error("Promo code has expired");
      if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
        throw new Error("Promo code has reached its usage limit");
      }

      if (
        promo.applies_to &&
        promo.applies_to.length > 0 &&
        !promo.applies_to.includes(data.ticket_type_id)
      ) {
        throw new Error(
          "This promo code does not apply to the selected ticket type"
        );
      }

      // Increment current_uses
      await supabase
        .from("promo_codes")
        .update({
          current_uses: promo.current_uses + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.promo_code_id);
    }

    // 5. Get the Stripe account: event-level first, then organization fallback
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("stripe_account_id, organization_id, organizations(stripe_account_id)")
      .eq("id", data.event_id)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found");
    }

    const stripeAccountId =
      event.stripe_account_id ??
      (event.organizations as unknown as { stripe_account_id: string | null })
        ?.stripe_account_id;

    if (!stripeAccountId) {
      throw new Error(
        "This event is not connected to a Stripe account. The organizer must connect Stripe before accepting paid registrations."
      );
    }

    // 6. Calculate totals
    const priceCents = Math.round((ticket.price ?? 0) * 100);
    const discountCents = Math.round((data.discount_amount ?? 0) * 100);
    const totalCents = Math.max(priceCents - discountCents, 0);

    if (totalCents <= 0) {
      throw new Error(
        "Total is $0 or less after discount. Please use the free registration flow instead."
      );
    }

    // 7. Create service-role client for inserting records (bypasses RLS)
    const supabaseJs = await import("@supabase/supabase-js");
    const adminSupabase = supabaseJs.createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get current user if logged in
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 8. Create pending registration
    const qrCode = nanoid(16);
    const registrationInsert: Record<string, unknown> = {
      event_id: data.event_id,
      ticket_type_id: data.ticket_type_id,
      user_id: user?.id ?? null,
      name: data.name,
      email: data.email,
      qr_code: qrCode,
      status: "pending",
      custom_fields: data.custom_fields ?? {},
    };

    if (data.promo_code_id) {
      registrationInsert.promo_code_id = data.promo_code_id;
      registrationInsert.discount_amount = data.discount_amount ?? 0;
    }

    const { data: registration, error: regError } = await adminSupabase
      .from("registrations")
      .insert(registrationInsert)
      .select("id")
      .single();

    if (regError || !registration) {
      throw new Error(
        `Failed to create registration: ${regError?.message ?? "Unknown error"}`
      );
    }

    // 9. Create pending order
    const tempSessionId = `pending_${nanoid()}`;
    const { data: order, error: orderError } = await adminSupabase
      .from("orders")
      .insert({
        event_id: data.event_id,
        registration_id: registration.id,
        stripe_checkout_session_id: tempSessionId,
        amount_total: totalCents,
        amount_discount: discountCents,
        amount_refunded: 0,
        currency: "usd",
        status: "pending",
        customer_email: data.email,
        customer_name: data.name,
        metadata: {},
      })
      .select("id")
      .single();

    if (orderError || !order) {
      throw new Error(
        `Failed to create order: ${orderError?.message ?? "Unknown error"}`
      );
    }

    // 10. Link order to registration
    await adminSupabase
      .from("registrations")
      .update({ order_id: order.id, updated_at: new Date().toISOString() })
      .eq("id", registration.id);

    // 11. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: ticket.name,
            },
            unit_amount: totalCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        transfer_data: {
          destination: stripeAccountId,
        },
      },
      mode: "payment",
      customer_email: data.email,
      success_url: `${data.origin}/register/${data.org_slug}/${data.event_slug}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${data.origin}/register/${data.org_slug}/${data.event_slug}`,
      metadata: {
        registration_id: registration.id,
        order_id: order.id,
        event_id: data.event_id,
      },
    });

    // 12. Update order with real Stripe checkout session ID
    await adminSupabase
      .from("orders")
      .update({
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    return { url: session.url };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred during checkout");
  }
}
