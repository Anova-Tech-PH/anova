import {
  getAnnouncements,
  getOrgTemplates,
} from "@/features/announcements/queries";
import { AnnouncementsPageClient } from "@/features/announcements/components/announcements-page-client";
import { createClient } from "@attendly/ui/supabase/server";

export default async function AnnouncementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const sp = await searchParams;
  const page = Number(sp?.page ?? 1);
  const pageSize = 10;
  const supabase = await createClient();

  // Fetch data in parallel
  const [
    announcements,
    ticketTypesResult,
    sessionsResult,
    categoriesResult,
    attendeeCountResult,
    eventResult,
  ] = await Promise.all([
    getAnnouncements(eventId, { page, pageSize }),
    supabase
      .from("ticket_types")
      .select("id, name")
      .eq("event_id", eventId)
      .order("sort_order"),
    supabase
      .from("sessions")
      .select("id, title")
      .eq("event_id", eventId)
      .order("title"),
    supabase
      .from("registrations")
      .select("category")
      .eq("event_id", eventId)
      .not("category", "is", null),
    supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .in("status", ["confirmed", "checked_in"]),
    supabase
      .from("events")
      .select("organization_id")
      .eq("id", eventId)
      .single(),
  ]);

  // Deduplicate categories
  const uniqueCategories = [
    ...new Set(
      (categoriesResult.data ?? [])
        .map((r) => r.category as string)
        .filter(Boolean)
    ),
  ].sort();

  // Fetch org templates (depends on event result)
  const organizationId = eventResult.data?.organization_id;
  const orgTemplates = organizationId
    ? await getOrgTemplates(organizationId, eventId)
    : [];

  return (
    <AnnouncementsPageClient
      eventId={eventId}
      drafts={announcements.drafts}
      sent={announcements.sent}
      totalDrafts={announcements.totalDrafts}
      totalSent={announcements.totalSent}
      ticketTypes={ticketTypesResult.data ?? []}
      sessions={(sessionsResult.data ?? []) as { id: string; title: string }[]}
      categories={uniqueCategories}
      totalAttendees={attendeeCountResult.count ?? 0}
      orgTemplates={orgTemplates}
      page={page}
      pageSize={pageSize}
    />
  );
}
