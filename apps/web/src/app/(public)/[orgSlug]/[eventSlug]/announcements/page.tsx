import { notFound } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { getAnnouncementsForAttendee } from "@/features/announcements/queries";
import { AnnouncementFeed } from "@/features/announcements/components/announcement-feed";

export default async function PublicAnnouncementsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();
  if (!org) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("organization_id", org.id)
    .eq("slug", eventSlug)
    .eq("status", "published")
    .single();
  if (!event) notFound();

  const announcements = await getAnnouncementsForAttendee(event.id);

  // Get user's read announcements
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let readIds = new Set<string>();
  if (user) {
    const { data: reads } = await supabase
      .from("announcement_reads")
      .select("announcement_id")
      .eq("user_id", user.id);
    readIds = new Set((reads ?? []).map((r) => r.announcement_id));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold">Announcements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Updates from the {event.title} organizers.
        </p>
      </div>
      <AnnouncementFeed announcements={announcements} readIds={readIds} />
    </div>
  );
}
