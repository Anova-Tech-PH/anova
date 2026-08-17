import {
  getInvitationCode,
  getEventAdmins,
  getOrgAdminsForEvent,
  getSharedTemplates,
  getTemplateRequests,
} from "@/features/admin-settings/queries";
import { InvitationCodeSection } from "@/features/admin-settings/components/invitation-code-section";
import { EventAdminsSection } from "@/features/admin-settings/components/event-admins-section";
import { CheckinStaffSection } from "@/features/admin-settings/components/checkin-staff-section";
import { ShareTemplatesSection } from "@/features/admin-settings/components/share-templates-section";

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const [invitationCode, eventAdmins, orgAdmins, sharedTemplates, templateRequests] =
    await Promise.all([
      getInvitationCode(eventId),
      getEventAdmins(eventId),
      getOrgAdminsForEvent(eventId),
      getSharedTemplates(eventId),
      getTemplateRequests(eventId),
    ]);

  const checkInStaff = eventAdmins.filter((a) => a.role === "check_in");
  const incomingRequests = templateRequests.filter((r) => r.direction === "incoming");
  const outgoingRequests = templateRequests.filter((r) => r.direction === "outgoing");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Admin Settings</h2>
        <p className="text-muted-foreground">
          Manage invitation codes, event admins, check-in staff, and template sharing.
        </p>
      </div>

      <InvitationCodeSection
        eventId={eventId}
        initialCode={invitationCode.code}
        initialRequired={invitationCode.required}
      />

      <EventAdminsSection
        eventId={eventId}
        eventAdmins={eventAdmins}
        orgAdmins={orgAdmins}
      />

      <CheckinStaffSection
        eventId={eventId}
        checkInStaff={checkInStaff}
      />

      <ShareTemplatesSection
        eventId={eventId}
        sharedTemplates={sharedTemplates}
        incomingRequests={incomingRequests}
        outgoingRequests={outgoingRequests}
      />
    </div>
  );
}
