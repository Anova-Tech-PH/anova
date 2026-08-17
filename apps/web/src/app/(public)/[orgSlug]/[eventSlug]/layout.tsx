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
    attendeeCount: 0,
    communityCount: 0,
    unreadMessageCount: 0,
    hasLeaderboard: false,
    isRegistered: false,
    hasFeedback: false,
    hasContests: false,
    hasTrivia: false,
    hasPassport: false,
  };

  const { data: { user } } = await supabase.auth.getUser();

  if (event) {
    // Run visibility queries in parallel
    const [roomsResult, resourcesResult, attendeesResult, communityResult, messagesResult, gamificationResult, registrationResult, surveyResult, logisticsResult, volunteerResult] = await Promise.all([
      supabase
        .from("breakout_rooms")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id),
      supabase
        .from("event_documents")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id),
      supabase
        .from("attendee_profiles")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .eq("is_visible_in_directory", true),
      supabase
        .from("community_topics")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id),
      user
        ? supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("recipient_id", user.id)
            .eq("read", false)
        : Promise.resolve({ count: 0 }),
      supabase
        .from("gamification_configs")
        .select("enabled")
        .eq("event_id", event.id)
        .single(),
      user
        ? supabase
            .from("registrations")
            .select("id", { count: "exact", head: true })
            .eq("event_id", event.id)
            .eq("user_id", user.id)
        : Promise.resolve({ count: 0 }),
      supabase
        .from("surveys")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .eq("status", "active"),
      supabase
        .from("logistics_items")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id),
      supabase
        .from("volunteer_settings")
        .select("is_published")
        .eq("event_id", event.id)
        .single(),
    ]);

    const settings = (event.settings ?? {}) as Record<string, unknown>;

    sidebarData = {
      hasRooms: (roomsResult.count ?? 0) > 0,
      hasResources: (resourcesResult.count ?? 0) > 0,
      hasLogistics: (logisticsResult.count ?? 0) > 0,
      hasCertificates: settings.certificates_enabled === true,
      attendeeCount: attendeesResult.count ?? 0,
      communityCount: communityResult.count ?? 0,
      unreadMessageCount: messagesResult.count ?? 0,
      hasLeaderboard: gamificationResult.data?.enabled === true,
      isRegistered: (registrationResult.count ?? 0) > 0,
      hasFeedback: (surveyResult.count ?? 0) > 0,
      hasVolunteer: volunteerResult.data?.is_published === true,
    };

    // If gamification is enabled, check for contests, trivia, and sponsors
    if (sidebarData.hasLeaderboard) {
      const [contestResult, triviaResult, sponsorResult] = await Promise.all([
        supabase
          .from("contests")
          .select("id", { count: "exact", head: true })
          .eq("event_id", event.id)
          .eq("status", "active"),
        supabase
          .from("trivia_games")
          .select("id", { count: "exact", head: true })
          .eq("event_id", event.id)
          .eq("status", "active"),
        supabase
          .from("sponsors")
          .select("id", { count: "exact", head: true })
          .eq("event_id", event.id),
      ]);

      sidebarData.hasContests = (contestResult.count ?? 0) > 0;
      sidebarData.hasTrivia = (triviaResult.count ?? 0) > 0;
      sidebarData.hasPassport = (sponsorResult.count ?? 0) > 0;
    }
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
