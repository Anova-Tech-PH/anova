import { createClient } from "@attendly/ui/supabase/server";
import { getStripeConnectionStatus } from "@/features/payments/queries";
import { StripeConnectCard } from "@/features/payments/components/stripe-connect-card";

export default async function PayoutPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("organization_id")
    .eq("id", eventId)
    .single();

  if (!event) return <p>Event not found</p>;

  const status = await getStripeConnectionStatus(event.organization_id);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Payout</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your Stripe account to collect payments from ticket sales.
        </p>
      </div>
      <StripeConnectCard
        organizationId={event.organization_id}
        eventId={eventId}
        status={status}
      />
    </div>
  );
}
