import { createClient } from "@attendly/ui/supabase/server";

export type WallConfig = {
  id: string;
  event_id: string;
  enabled: boolean;
  rotation_speed: number;
  theme: "dark" | "light";
  show_event_overview: boolean;
  show_announcements: boolean;
  show_upcoming_sessions: boolean;
  show_sponsors: boolean;
  show_polls: boolean;
  show_custom_slides: boolean;
  session_lookahead_minutes: number;
  created_at: string;
  updated_at: string;
};

export type CustomSlide = {
  id: string;
  event_id: string;
  title: string;
  body: string | null;
  bg_color: string;
  display_order: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Fetch the announcement wall config for an event, or null if none exists.
 */
export async function getWallConfig(
  eventId: string
): Promise<WallConfig | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcement_wall_config")
    .select("*")
    .eq("event_id", eventId)
    .single();

  if (error || !data) return null;
  return data as WallConfig;
}

/**
 * Returns default config values (pure function, no DB).
 */
export function getDefaultConfig(): Omit<WallConfig, "id" | "event_id" | "created_at" | "updated_at"> {
  return {
    enabled: false,
    rotation_speed: 10,
    theme: "dark",
    show_event_overview: true,
    show_announcements: true,
    show_upcoming_sessions: true,
    show_sponsors: true,
    show_polls: true,
    show_custom_slides: true,
    session_lookahead_minutes: 120,
  };
}

/**
 * Fetch enabled custom slides for an event, ordered by display_order.
 */
export async function getCustomSlides(
  eventId: string
): Promise<CustomSlide[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcement_wall_slides")
    .select("*")
    .eq("event_id", eventId)
    .eq("enabled", true)
    .order("display_order");

  if (error) return [];
  return (data ?? []) as CustomSlide[];
}

/**
 * Fetch all custom slides (including disabled) for an event, ordered by display_order.
 */
export async function getAllCustomSlides(
  eventId: string
): Promise<CustomSlide[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcement_wall_slides")
    .select("*")
    .eq("event_id", eventId)
    .order("display_order");

  if (error) return [];
  return (data ?? []) as CustomSlide[];
}

/**
 * Aggregated query that fetches all data needed for the announcement wall display.
 * Uses Promise.all for parallel fetching.
 */
export async function getWallData(eventId: string) {
  const supabase = await createClient();

  const now = new Date().toISOString();
  const twoHoursFromNow = new Date(
    Date.now() + 2 * 60 * 60 * 1000
  ).toISOString();

  const [
    configResult,
    slidesResult,
    announcementsResult,
    sessionsResult,
    sponsorsResult,
    pollsResult,
    eventResult,
  ] = await Promise.all([
    // Config
    supabase
      .from("announcement_wall_config")
      .select("*")
      .eq("event_id", eventId)
      .single(),

    // Custom slides (enabled only)
    supabase
      .from("announcement_wall_slides")
      .select("*")
      .eq("event_id", eventId)
      .eq("enabled", true)
      .order("display_order"),

    // Recent sent announcements (limit 10)
    supabase
      .from("announcements")
      .select("*")
      .eq("event_id", eventId)
      .eq("status", "sent")
      .order("sent_at", { ascending: false })
      .limit(10),

    // Upcoming sessions (within 2 hours) with speakers
    supabase
      .from("sessions")
      .select(
        `*, session_speakers(speaker_id, speakers(id, name, title, company, photo))`
      )
      .eq("event_id", eventId)
      .gte("start_time", now)
      .lte("start_time", twoHoursFromNow)
      .order("start_time"),

    // Sponsors with tiers
    supabase
      .from("sponsors")
      .select("*, tier:sponsor_tiers(*)")
      .eq("event_id", eventId)
      .order("sort_order"),

    // Active polls
    supabase
      .from("live_polls")
      .select("*")
      .eq("event_id", eventId)
      .eq("status", "open")
      .order("sort_order"),

    // Event details
    supabase
      .from("events")
      .select(
        "id, title, slug, start_date, end_date, location_data, organization_id, organizations(slug)"
      )
      .eq("id", eventId)
      .single(),
  ]);

  const defaults = getDefaultConfig();

  return {
    config: configResult.data
      ? (configResult.data as WallConfig)
      : ({ ...defaults, event_id: eventId } as Omit<
          WallConfig,
          "id" | "created_at" | "updated_at"
        >),
    customSlides: (slidesResult.data ?? []) as CustomSlide[],
    announcements: announcementsResult.data ?? [],
    upcomingSessions: sessionsResult.data ?? [],
    sponsors: sponsorsResult.data ?? [],
    polls: pollsResult.data ?? [],
    event: eventResult.data,
  };
}
