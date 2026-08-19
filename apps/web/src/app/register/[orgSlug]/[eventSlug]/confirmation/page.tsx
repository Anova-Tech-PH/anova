import { createClient as createAdminClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { QrConfirmation } from "../qr-confirmation";
import { PaymentProcessing } from "./payment-processing";

export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  if (!session_id) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-muted-foreground">Invalid confirmation link.</p>
      </div>
    );
  }

  // Use service-role client to bypass RLS (unauthenticated users can't read orders)
  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Look up order by Stripe session ID
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, status, registration_id")
    .eq("stripe_checkout_session_id", session_id)
    .single();

  if (orderError || !order) {
    console.error("Order lookup failed:", orderError?.message);
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-lg font-semibold">Processing your payment...</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Your payment is being confirmed. You&apos;ll receive a confirmation email shortly.
        </p>
      </div>
    );
  }

  if (order.status === "pending") {
    // Webhook may not have arrived yet — check Stripe directly
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      if (session.payment_status === "paid") {
        // Webhook was missed — update order and registration inline
        await supabase
          .from("orders")
          .update({
            status: "completed",
            stripe_payment_intent_id: session.payment_intent as string,
          })
          .eq("id", order.id);

        await supabase
          .from("registrations")
          .update({ status: "confirmed" })
          .eq("id", order.registration_id);

        // Fall through to render the confirmation below
      } else {
        // Payment genuinely not complete yet — show polling UI
        return <PaymentProcessing />;
      }
    } catch {
      return <PaymentProcessing />;
    }
  }

  // Fetch registration details separately
  const { data: reg } = await supabase
    .from("registrations")
    .select("name, email, qr_code, ticket_types(name)")
    .eq("id", order.registration_id)
    .single();

  if (!reg) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-lg font-semibold">Registration not found</p>
      </div>
    );
  }

  const { orgSlug, eventSlug } = await params;

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <QrConfirmation
        name={reg.name}
        email={reg.email}
        qrCode={reg.qr_code}
        ticketName={(reg.ticket_types as any)?.name ?? "General"}
        orgSlug={orgSlug}
        eventSlug={eventSlug}
      />
    </div>
  );
}
