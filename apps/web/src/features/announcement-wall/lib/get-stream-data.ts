import { notFound } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { getWallData } from "../queries";
import { buildFeedItems, type FeedItem } from "./build-feed-items";

/**
 * Shared data fetching for the activity stream routes (full-page and embed).
 * Resolves org/event, checks activity_stream_enabled, builds feed items.
 */
export async function getStreamData(
  orgSlug: string,
  eventSlug: string
): Promise<{ items: FeedItem[]; theme: "dark" | "light"; eventTitle: string }> {
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

  const wallData = await getWallData(event.id);
  const config = wallData.config;

  if (!config.activity_stream_enabled) {
    notFound();
  }

  const items = buildFeedItems({
    config: {
      show_announcements: config.show_announcements,
      show_upcoming_sessions: config.show_upcoming_sessions,
      show_sponsors: config.show_sponsors,
      show_polls: config.show_polls,
      show_custom_slides: config.show_custom_slides,
    },
    announcements: wallData.announcements.map((a: Record<string, unknown>) => ({
      id: a.id as string,
      subject: a.subject as string,
      body: a.body as string,
      sent_at: a.sent_at as string,
    })),
    upcomingSessions: wallData.upcomingSessions as {
      id: string;
      title: string;
      start_time: string;
      end_time: string;
      location: string | null;
      session_speakers?: { speakers: { name: string } }[];
    }[],
    sponsors: wallData.sponsors as {
      id: string;
      name: string;
      logo: string | null;
      tier?: { name: string; sort_order: number } | null;
    }[],
    activePolls: wallData.polls.map((p: Record<string, unknown>) => ({
      id: p.id as string,
      question: p.question as string,
      status: p.status as string,
    })),
    customSlides: wallData.customSlides,
  });

  return {
    items,
    theme: config.theme,
    eventTitle: event.title,
  };
}
