import { getEmailLogsByEvent, getEmailAutomationsByEvent, getEmailStats } from "@/features/emails/queries";
import { getTicketTypesByEvent } from "@/features/tickets/queries";
import { EmailDashboard } from "@/features/emails/components/email-dashboard";
import { EmailLogTable } from "@/features/emails/components/email-log-table";
import { AutomationList } from "@/features/emails/components/automation-list";
import { EmailsPageClient } from "@/features/emails/components/emails-page-client";

export default async function EmailsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const [stats, logs, automations, ticketTypes] = await Promise.all([
    getEmailStats(eventId),
    getEmailLogsByEvent(eventId),
    getEmailAutomationsByEvent(eventId),
    getTicketTypesByEvent(eventId),
  ]);

  return (
    <div className="space-y-8">
      <EmailsPageClient eventId={eventId} ticketTypes={ticketTypes} />
      <EmailDashboard stats={stats} />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Automations</h2>
        <AutomationList initialAutomations={automations} />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Emails</h2>
        <EmailLogTable logs={logs} />
      </div>
    </div>
  );
}
