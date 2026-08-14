import { getRegistrationPages } from "@/features/registration-pages/queries";
import { getTicketTypesByEvent } from "@/features/tickets/queries";
import { RegistrationPagesManager } from "@/features/registration-pages/components/registration-pages-manager";

export default async function RegistrationPagesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [pages, ticketTypes] = await Promise.all([
    getRegistrationPages(eventId),
    getTicketTypesByEvent(eventId),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Registration Pages</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create multiple registration pages with different ticket subsets, each with a unique shareable URL.
        </p>
      </div>
      <RegistrationPagesManager eventId={eventId} pages={pages} ticketTypes={ticketTypes} />
    </div>
  );
}
