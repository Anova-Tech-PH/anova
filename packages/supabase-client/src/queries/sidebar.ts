import type { SupabaseClient } from "@supabase/supabase-js";

export interface SidebarData {
  hasRooms: boolean;
  hasResources: boolean;
  hasLogistics: boolean;
  hasCertificates: boolean;
  attendeeCount: number;
  communityCount: number;
  unreadMessageCount: number;
  hasLeaderboard: boolean;
  isRegistered: boolean;
  hasFeedback: boolean;
  hasContests: boolean;
  hasTrivia: boolean;
  hasPassport: boolean;
  hasVolunteer: boolean;
}

export async function getSidebarData(
  client: SupabaseClient,
  eventId: string,
): Promise<SidebarData> {
  const { data: { user } } = await client.auth.getUser();

  const [
    roomsResult,
    resourcesResult,
    logisticsResult,
    attendeesResult,
    communityResult,
    messagesResult,
    gamificationResult,
    surveyResult,
    volunteerResult,
    registrationResult,
    eventResult,
  ] = await Promise.all([
    client.from("breakout_rooms").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    client.from("event_documents").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    client.from("logistics_items").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    client.from("attendee_profiles").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("is_visible_in_directory", true),
    client.from("community_topics").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    user
      ? client.from("direct_messages").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).is("read_at", null)
      : Promise.resolve({ count: 0 }),
    client.from("gamification_configs").select("enabled").eq("event_id", eventId).single(),
    client.from("surveys").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "active"),
    client.from("volunteer_settings").select("is_published").eq("event_id", eventId).maybeSingle(),
    user
      ? client.from("registrations").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("user_id", user.id)
      : Promise.resolve({ count: 0 }),
    client.from("events").select("settings").eq("id", eventId).single(),
  ]);

  const settings = ((eventResult as { data?: { settings?: Record<string, unknown> } }).data?.settings ?? {}) as Record<string, unknown>;
  const gamificationEnabled = (gamificationResult as { data?: { enabled: boolean } | null }).data?.enabled === true;

  let hasContests = false;
  let hasTrivia = false;
  let hasPassport = false;

  if (gamificationEnabled) {
    const [contestResult, triviaResult, sponsorResult] = await Promise.all([
      client.from("contests").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "active"),
      client.from("trivia_games").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "active"),
      client.from("sponsors").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    ]);
    hasContests = ((contestResult as { count?: number | null }).count ?? 0) > 0;
    hasTrivia = ((triviaResult as { count?: number | null }).count ?? 0) > 0;
    hasPassport = ((sponsorResult as { count?: number | null }).count ?? 0) > 0;
  }

  return {
    hasRooms: ((roomsResult as { count?: number | null }).count ?? 0) > 0,
    hasResources: ((resourcesResult as { count?: number | null }).count ?? 0) > 0,
    hasLogistics: ((logisticsResult as { count?: number | null }).count ?? 0) > 0,
    hasCertificates: settings.certificates_enabled === true,
    attendeeCount: (attendeesResult as { count?: number | null }).count ?? 0,
    communityCount: (communityResult as { count?: number | null }).count ?? 0,
    unreadMessageCount: (messagesResult as { count?: number | null }).count ?? 0,
    hasLeaderboard: gamificationEnabled,
    isRegistered: ((registrationResult as { count?: number | null }).count ?? 0) > 0,
    hasFeedback: ((surveyResult as { count?: number | null }).count ?? 0) > 0,
    hasContests,
    hasTrivia,
    hasPassport,
    hasVolunteer: (volunteerResult as { data?: { is_published: boolean } | null }).data?.is_published === true,
  };
}
