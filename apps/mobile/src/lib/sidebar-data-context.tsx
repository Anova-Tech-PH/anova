import React, { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { useAuth } from "./auth-context";
import { useEventContext } from "./event-context";
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

const defaultSidebarData: SidebarData = {
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
  hasVolunteer: false,
};

const SidebarDataContext = createContext<{
  sidebarData: SidebarData;
  isLoading: boolean;
}>({
  sidebarData: defaultSidebarData,
  isLoading: false,
});

async function fetchSidebarData(
  client: SupabaseClient,
  eventId: string,
  userId: string | null,
): Promise<SidebarData> {
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
    userId
      ? client.from("direct_messages").select("id", { count: "exact", head: true }).eq("recipient_id", userId).is("read_at", null)
      : Promise.resolve({ count: 0 } as { count: number }),
    client.from("gamification_configs").select("enabled").eq("event_id", eventId).single(),
    client.from("surveys").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "active"),
    client.from("volunteer_settings").select("is_published").eq("event_id", eventId).maybeSingle(),
    userId
      ? client.from("registrations").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("user_id", userId)
      : Promise.resolve({ count: 0 } as { count: number }),
    client.from("events").select("settings").eq("id", eventId).single(),
  ]);

  const settings = ((eventResult as any).data?.settings ?? {}) as Record<string, unknown>;
  const gamificationEnabled = (gamificationResult as any).data?.enabled === true;

  let hasContests = false;
  let hasTrivia = false;
  let hasPassport = false;

  if (gamificationEnabled) {
    const [contestResult, triviaResult, sponsorResult] = await Promise.all([
      client.from("contests").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "active"),
      client.from("trivia_games").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "active"),
      client.from("sponsors").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    ]);
    hasContests = ((contestResult as any).count ?? 0) > 0;
    hasTrivia = ((triviaResult as any).count ?? 0) > 0;
    hasPassport = ((sponsorResult as any).count ?? 0) > 0;
  }

  return {
    hasRooms: ((roomsResult as any).count ?? 0) > 0,
    hasResources: ((resourcesResult as any).count ?? 0) > 0,
    hasLogistics: ((logisticsResult as any).count ?? 0) > 0,
    hasCertificates: settings.certificates_enabled === true,
    attendeeCount: (attendeesResult as any).count ?? 0,
    communityCount: (communityResult as any).count ?? 0,
    unreadMessageCount: (messagesResult as any).count ?? 0,
    hasLeaderboard: gamificationEnabled,
    isRegistered: ((registrationResult as any).count ?? 0) > 0,
    hasFeedback: ((surveyResult as any).count ?? 0) > 0,
    hasContests,
    hasTrivia,
    hasPassport,
    hasVolunteer: (volunteerResult as any).data?.is_published === true,
  };
}

export function SidebarDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { currentEvent } = useEventContext();

  const { data: sidebarData = defaultSidebarData, isLoading } = useQuery({
    queryKey: ["sidebar-data", currentEvent?.id, user?.id],
    queryFn: () => fetchSidebarData(supabase, currentEvent!.id, user?.id ?? null),
    enabled: !!currentEvent?.id,
    staleTime: 1000 * 60 * 5,
  });

  return (
    <SidebarDataContext.Provider value={{ sidebarData, isLoading }}>
      {children}
    </SidebarDataContext.Provider>
  );
}

export function useSidebarData() {
  return useContext(SidebarDataContext);
}
