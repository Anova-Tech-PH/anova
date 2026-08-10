import { getAnnouncements } from "@/features/announcements/queries";
import { AnnouncementComposer } from "@/features/announcements/components/announcement-composer";
import { AnnouncementList } from "@/features/announcements/components/announcement-list";
import { createClient } from "@attendly/ui/supabase/server";

export default async function AnnouncementsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();
  const announcements = await getAnnouncements(eventId);

  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("id, name")
    .eq("event_id", eventId)
    .order("sort_order");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Announcements</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Send announcements to your attendees via in-app notifications, email, or push.
        </p>
      </div>

      <AnnouncementComposer eventId={eventId} ticketTypes={ticketTypes ?? []} />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Sent &amp; Drafts</h3>
        <AnnouncementList announcements={announcements} eventId={eventId} />
      </div>
    </div>
  );
}
