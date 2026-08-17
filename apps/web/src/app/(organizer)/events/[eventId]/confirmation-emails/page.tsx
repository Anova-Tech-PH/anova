import { getTemplatesByEvent } from "@/features/confirmation-emails/queries";
import { getTicketTypesByEvent } from "@/features/tickets/queries";
import { EmailTemplateManager } from "@/features/confirmation-emails/components/email-template-manager";

export default async function ConfirmationEmailsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [templates, ticketTypes] = await Promise.all([
    getTemplatesByEvent(eventId),
    getTicketTypesByEvent(eventId),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Confirmation Emails</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Attendees receive a confirmation email once they register for your event. Customize the content and settings for those emails here.
        </p>
      </div>
      <EmailTemplateManager eventId={eventId} templates={templates} ticketTypes={ticketTypes} />
    </div>
  );
}
