import { createClient as createAdminClient } from "@supabase/supabase-js";
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
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-lg font-semibold">Payment processing...</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Your payment is being confirmed. You&apos;ll receive a confirmation email shortly.
        </p>
      </div>
    );
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

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <QrConfirmation
        name={reg.name}
        email={reg.email}
        qrCode={reg.qr_code}
        ticketName={(reg.ticket_types as any)?.name ?? "General"}
      />
    </div>
  );
}
