import { createClient } from "@attendly/ui/supabase/server";
import { QrConfirmation } from "../qr-confirmation";

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

  const supabase = await createClient();

  // Look up order by Stripe session ID
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, registrations(name, email, qr_code, ticket_types(name))")
    .eq("stripe_checkout_session_id", session_id)
    .single();

  if (!order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-lg font-semibold">Processing your payment...</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Your payment is being confirmed. You'll receive a confirmation email shortly.
        </p>
      </div>
    );
  }

  const reg = order.registrations as any;

  if (order.status === "pending") {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-lg font-semibold">Payment processing...</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Your payment is being confirmed. You'll receive a confirmation email at{" "}
          <strong>{reg?.email}</strong> shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <QrConfirmation
        name={reg.name}
        email={reg.email}
        qrCode={reg.qr_code}
        ticketName={reg.ticket_types?.name ?? "General"}
      />
    </div>
  );
}
