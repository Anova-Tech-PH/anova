import { getTicketTypesWithCounts } from "@/features/tickets/queries";
import { TicketList } from "@/features/tickets/components/ticket-list";

export default async function TicketsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const tickets = await getTicketTypesWithCounts(eventId);

  return (
    <div className="space-y-6">
      <TicketList eventId={eventId} initialTickets={tickets} />
    </div>
  );
}
