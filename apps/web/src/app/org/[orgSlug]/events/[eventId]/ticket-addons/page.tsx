import { getAddonsByEvent } from "@/features/ticket-addons/queries";
import { getTicketTypesByEvent } from "@/features/tickets/queries";
import { AddonManager } from "@/features/ticket-addons/components/addon-manager";
import { PackagePlus } from "lucide-react";

export default async function TicketAddonsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [addons, ticketTypes] = await Promise.all([
    getAddonsByEvent(eventId),
    getTicketTypesByEvent(eventId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[oklch(0.445_0.107_195_/_0.1)]">
          <PackagePlus className="h-5 w-5 text-[oklch(0.445_0.107_195)]" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Ticket Add-ons</h2>
          <p className="text-sm text-muted-foreground">
            Sell add-ons such as t-shirts, parking passes, and other extras. Attendees can purchase these during registration.
          </p>
        </div>
      </div>

      <AddonManager
        eventId={eventId}
        addons={addons}
        ticketTypes={ticketTypes}
      />
    </div>
  );
}
