import { getRegistrationPages } from "@/features/registration-pages/queries";
import { getTicketTypesByEvent } from "@/features/tickets/queries";
import { RegistrationPagesManager } from "@/features/registration-pages/components/registration-pages-manager";
import { FileText } from "lucide-react";

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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[oklch(0.445_0.107_195_/_0.1)]">
          <FileText className="h-5 w-5 text-[oklch(0.445_0.107_195)]" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Attendee Registration Pages</h1>
          <p className="text-sm text-muted-foreground">
            Create and customize registration pages for your attendees. We recommend creating multiple registration pages if you want to hide some tickets from specific attendees.
          </p>
        </div>
      </div>
      <RegistrationPagesManager eventId={eventId} pages={pages} ticketTypes={ticketTypes} />
    </div>
  );
}
