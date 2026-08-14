import { createClient } from "@attendly/ui/supabase/server";

export type CheckStatus = "pass" | "fail" | "warning";

export interface ReadinessCheck {
  id: string;
  name: string;
  description: string;
  status: CheckStatus;
  required: boolean;
  fixHref: string;
}

export async function getPublishReadiness(eventId: string): Promise<{
  checks: ReadinessCheck[];
  requiredPassed: number;
  requiredTotal: number;
  canPublish: boolean;
}> {
  const supabase = await createClient();

  const [eventResult, sessionsResult, speakersResult, ticketsResult, surveysResult] =
    await Promise.all([
      supabase.from("events").select("title, start_date, end_date, venue_name, is_virtual, virtual_url, website_config").eq("id", eventId).single(),
      supabase.from("sessions").select("id", { count: "exact", head: true }).eq("event_id", eventId),
      supabase.from("session_speakers").select("id", { count: "exact", head: true }).in(
        "session_id",
        (await supabase.from("sessions").select("id").eq("event_id", eventId)).data?.map((s) => s.id) ?? []
      ),
      supabase.from("ticket_types").select("id", { count: "exact", head: true }).eq("event_id", eventId),
      supabase.from("surveys").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    ]);

  const event = eventResult.data;
  if (!event) throw new Error("Event not found");

  const hasVenue = event.venue_name || (event.is_virtual && event.virtual_url);
  const basicsComplete = !!(event.title && event.start_date && event.end_date && hasVenue);

  const sessionCount = sessionsResult.count ?? 0;
  const speakerCount = speakersResult.count ?? 0;
  const ticketCount = ticketsResult.count ?? 0;
  const surveyCount = surveysResult.count ?? 0;
  const websiteEnabled = (event.website_config as { enabled?: boolean })?.enabled === true;

  const checks: ReadinessCheck[] = [
    {
      id: "basics",
      name: "Event basics complete",
      description: "Title, dates, and venue (or virtual URL) are configured.",
      status: basicsComplete ? "pass" : "fail",
      required: true,
      fixHref: `/events/${eventId}`,
    },
    {
      id: "sessions",
      name: "At least 1 session",
      description: "Your agenda has at least one session scheduled.",
      status: sessionCount > 0 ? "pass" : "fail",
      required: true,
      fixHref: `/events/${eventId}/schedule`,
    },
    {
      id: "speakers",
      name: "Speakers assigned",
      description: "At least one speaker is linked to a session.",
      status: speakerCount > 0 ? "pass" : "warning",
      required: false,
      fixHref: `/events/${eventId}/speakers`,
    },
    {
      id: "tickets",
      name: "Tickets configured",
      description: "At least one ticket type is set up for registration.",
      status: ticketCount > 0 ? "pass" : "warning",
      required: false,
      fixHref: `/events/${eventId}/tickets`,
    },
    {
      id: "survey",
      name: "Survey created",
      description: "A post-event survey is ready to collect feedback.",
      status: surveyCount > 0 ? "pass" : "warning",
      required: false,
      fixHref: `/events/${eventId}/survey`,
    },
    {
      id: "website",
      name: "Website enabled",
      description: "Your event website is configured and enabled.",
      status: websiteEnabled ? "pass" : "warning",
      required: false,
      fixHref: `/events/${eventId}/website`,
    },
  ];

  const requiredChecks = checks.filter((c) => c.required);
  const requiredPassed = requiredChecks.filter((c) => c.status === "pass").length;

  return {
    checks,
    requiredPassed,
    requiredTotal: requiredChecks.length,
    canPublish: requiredPassed === requiredChecks.length,
  };
}

export interface RecommendationCard {
  id: string;
  name: string;
  description: string;
  configured: boolean;
  href: string;
}

export async function getPostPublishRecommendations(eventId: string): Promise<RecommendationCard[]> {
  const supabase = await createClient();

  const [
    announcementsResult,
    checkInsResult,
    surveysResult,
    rsvpResult,
    campaignsResult,
    pollsResult,
    documentsResult,
    meetupsResult,
    eventResult,
  ] = await Promise.all([
    supabase.from("announcements").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "sent"),
    supabase.from("check_ins").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabase.from("surveys").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabase.from("sessions").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("rsvp_enabled", true),
    supabase.from("email_campaigns").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabase.from("live_polls").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabase.from("event_documents").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabase.from("meetups").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabase.from("events").select("website_config").eq("id", eventId).single(),
  ]);

  const websiteEnabled = (eventResult.data?.website_config as { enabled?: boolean })?.enabled === true;

  const cards: RecommendationCard[] = [
    {
      id: "announcements",
      name: "Send Announcement",
      description: "Make your efforts pay off! Announce the event to your attendees so they can start engaging.",
      configured: (announcementsResult.count ?? 0) > 0,
      href: `/events/${eventId}/announcements`,
    },
    {
      id: "check-in",
      name: "Set Up Check-in",
      description: "Easily check in attendees using smartphones or tablets. Supports event, day, and session check-in.",
      configured: (checkInsResult.count ?? 0) > 0,
      href: `/events/${eventId}/check-in`,
    },
    {
      id: "badges",
      name: "Configure Name Badges",
      description: "Customize and print branded name badges for attendees.",
      configured: false,
      href: `/events/${eventId}/badges`,
    },
    {
      id: "survey",
      name: "Create a Survey",
      description: "Collect attendee feedback and satisfaction data. 2X your response rate with in-app prompts.",
      configured: (surveysResult.count ?? 0) > 0,
      href: `/events/${eventId}/survey`,
    },
    {
      id: "rsvp",
      name: "Enable Session RSVP",
      description: "Get accurate session headcounts so you can match room sizes to expected attendance.",
      configured: (rsvpResult.count ?? 0) > 0,
      href: `/events/${eventId}/rsvp`,
    },
    {
      id: "email-campaign",
      name: "Send Email Campaign",
      description: "Promote your event and keep attendees informed with targeted email campaigns.",
      configured: (campaignsResult.count ?? 0) > 0,
      href: `/events/${eventId}/emails/campaigns`,
    },
    {
      id: "polls",
      name: "Set Up Live Polls",
      description: "Create interactive polls for sessions to boost engagement.",
      configured: (pollsResult.count ?? 0) > 0,
      href: `/events/${eventId}/polls`,
    },
    {
      id: "documents",
      name: "Upload Documents",
      description: "Share resources, handouts, and materials with your attendees.",
      configured: (documentsResult.count ?? 0) > 0,
      href: `/events/${eventId}/documents`,
    },
    {
      id: "meetups",
      name: "Create Meetups",
      description: "Let attendees organize social meetups and networking activities.",
      configured: (meetupsResult.count ?? 0) > 0,
      href: `/events/${eventId}/meetups`,
    },
    {
      id: "website",
      name: "Enable Website",
      description: "Publish an event website to showcase your agenda, speakers, and registration.",
      configured: websiteEnabled,
      href: `/events/${eventId}/website`,
    },
  ];

  return cards.sort((a, b) => Number(a.configured) - Number(b.configured));
}
