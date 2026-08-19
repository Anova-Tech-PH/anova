import { getGroupTicketsWithCounts } from "@/features/tickets/group-tickets-queries";
import { GroupTicketList } from "@/features/tickets/components/group-ticket-list";
import { Users } from "lucide-react";

export default async function GroupTicketsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const tickets = await getGroupTicketsWithCounts(eventId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[oklch(0.445_0.107_195_/_0.1)]">
          <Users className="h-5 w-5 text-[oklch(0.445_0.107_195)]" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Group Tickets</h2>
          <p className="text-sm text-muted-foreground">
            Sell more tickets by offering bulk purchase discounts.
          </p>
        </div>
      </div>

      <GroupTicketList eventId={eventId} initialTickets={tickets} />
    </div>
  );
}
