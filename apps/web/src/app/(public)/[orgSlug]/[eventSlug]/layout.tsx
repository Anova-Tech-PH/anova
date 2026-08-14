import { EventSidebar } from "./event-sidebar";
import type { SidebarData } from "./event-sidebar";
import { EventHeaderBar } from "./event-header-bar";
import { createClient } from "@attendly/ui/supabase/server";

export default async function PublicEventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const supabase = await createClient();

  // Fetch org first to get org ID
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  const { data: event } = await supabase
    .from("events")
    .select("id, title, start_date, end_date, venue_name, timezone, is_virtual, settings")
    .eq("slug", eventSlug)
    .eq("organization_id", org?.id ?? "")
    .single();

  // Build sidebar visibility data
  let sidebarData: SidebarData = {
    hasRooms: false,
    hasResources: false,
    hasLogistics: false,
    hasCertificates: false,
    communityCount: 0,
    unreadMessageCount: 0,
  };

  if (event) {
    // Run visibility queries in parallel
    const [roomsResult, resourcesResult] = await Promise.all([
      supabase
        .from("breakout_rooms")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id),
      supabase
        .from("event_documents")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id),
    ]);

    const settings = (event.settings ?? {}) as Record<string, unknown>;

    sidebarData = {
      hasRooms: (roomsResult.count ?? 0) > 0,
      hasResources: (resourcesResult.count ?? 0) > 0,
      hasLogistics: false, // No logistics table yet
      hasCertificates: settings.certificates_enabled === true,
      communityCount: 0, // Placeholder — will be implemented with community feature
      unreadMessageCount: 0, // Placeholder — will be implemented with messaging feature
    };
  }

  return (
    <div className="min-h-screen lg:flex">
      <EventSidebar params={params} sidebarData={sidebarData} />
      <div className="flex-1 min-w-0 flex flex-col">
        {event && <EventHeaderBar event={event} />}
        <main className="flex-1 min-w-0 pt-[57px] lg:pt-0">{children}</main>
      </div>
    </div>
  );
}
