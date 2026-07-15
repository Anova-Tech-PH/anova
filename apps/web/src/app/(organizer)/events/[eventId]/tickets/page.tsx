import { getTicketTypesWithCounts } from "@/features/tickets/queries";
import { TicketList } from "@/features/tickets/components/ticket-list";
import { Ticket } from "lucide-react";

export default async function TicketsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const tickets = await getTicketTypesWithCounts(eventId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[oklch(0.445_0.107_195_/_0.1)]">
          <Ticket className="h-5 w-5 text-[oklch(0.445_0.107_195)]" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Tickets</h1>
          <p className="text-sm text-muted-foreground">
            Manage ticket types, pricing, and availability for your event.
          </p>
        </div>
      </div>

      <TicketList eventId={eventId} initialTickets={tickets} />
    </div>
  );
}
