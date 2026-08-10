import { getAnnouncements } from "@/features/announcements/queries";
import { AnnouncementComposer } from "@/features/announcements/components/announcement-composer";
import { AnnouncementList } from "@/features/announcements/components/announcement-list";

export default async function AnnouncementsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const announcements = await getAnnouncements(eventId);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Announcements</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Send announcements to your attendees via in-app notifications, email, or push.
        </p>
      </div>

      <AnnouncementComposer eventId={eventId} />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Sent &amp; Drafts</h3>
        <AnnouncementList announcements={announcements} eventId={eventId} />
      </div>
    </div>
  );
}
