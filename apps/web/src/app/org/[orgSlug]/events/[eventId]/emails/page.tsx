import { createClient } from "@attendly/ui/supabase/server";
import { getEmailLogsByEvent, getEmailAutomationsByEvent, getEmailStats, getCampaigns, getContactLists } from "@/features/emails/queries";
import { getTicketTypesByEvent } from "@/features/tickets/queries";
import { getEmailTemplatesByOrg } from "@/features/emails/queries";
import { EmailDashboard } from "@/features/emails/components/email-dashboard";
import { EmailLogTable } from "@/features/emails/components/email-log-table";
import { AutomationList } from "@/features/emails/components/automation-list";
import { CampaignList } from "@/features/emails/components/campaign-list";
import { ContactLists } from "@/features/emails/components/contact-lists";
import { EmailsPageClient } from "@/features/emails/components/emails-page-client";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function EmailsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventId: string }>;
}) {
  const { orgSlug, eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("organization_id")
    .eq("id", eventId)
    .single();

  const orgId = event?.organization_id;

  const [stats, logs, automations, ticketTypes, campaigns, contactLists] = await Promise.all([
    getEmailStats(eventId),
    getEmailLogsByEvent(eventId),
    getEmailAutomationsByEvent(eventId),
    getTicketTypesByEvent(eventId),
    getCampaigns(eventId),
    orgId ? getContactLists(orgId) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Emails</h2>
        <div className="flex gap-2">
          <EmailsPageClient eventId={eventId} ticketTypes={ticketTypes} />
          <Link
            href={`/org/${orgSlug}/events/${eventId}/emails/campaigns/new`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> New Campaign
          </Link>
        </div>
      </div>

      <EmailDashboard stats={stats} />

      {/* Campaigns */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Campaigns</h2>
        <CampaignList campaigns={campaigns} eventId={eventId} />
      </div>

      {/* Contact Lists */}
      {orgId && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Contact Lists</h2>
          <ContactLists organizationId={orgId} initialLists={contactLists} />
        </div>
      )}

      {/* Automations */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Automations</h2>
        <AutomationList initialAutomations={automations} />
      </div>

      {/* Recent Emails */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Emails</h2>
        <EmailLogTable logs={logs} />
      </div>
    </div>
  );
}
