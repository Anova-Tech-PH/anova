export type SlideData = {
  type: "event_overview" | "announcement" | "session" | "sponsor" | "poll" | "custom";
  title: string;
  body?: string;
  meta?: string;
  bgColor?: string;
  logoUrl?: string;
  qrUrl?: string;
  qrLabel?: string;
  speakers?: string[];
};

export type BuildSlidesInput = {
  config: {
    show_event_overview: boolean;
    show_announcements: boolean;
    show_upcoming_sessions: boolean;
    show_sponsors: boolean;
    show_polls: boolean;
    show_custom_slides: boolean;
  };
  event: {
    title: string;
    slug: string;
    start_date: string;
    end_date: string;
    banner_url: string | null;
    location_name: string | null;
    organization: { slug: string } | null;
  };
  announcements: {
    id: string;
    subject: string;
    body: string;
    sent_at: string;
  }[];
  upcomingSessions: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    location: string | null;
    session_speakers?: { speakers: { name: string } }[];
  }[];
  sponsors: {
    id: string;
    name: string;
    logo: string | null;
    tier?: { name: string; sort_order: number } | null;
  }[];
  activePolls: {
    id: string;
    question: string;
    status: string;
  }[];
  customSlides: {
    id: string;
    title: string;
    body: string | null;
    bg_color: string;
    display_order: number;
    enabled: boolean;
  }[];
  baseUrl: string;
};

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };

  if (start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString("en-US", opts);
  }

  if (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth()
  ) {
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}-${end.getDate()}, ${end.getFullYear()}`;
  }

  return `${start.toLocaleDateString("en-US", opts)} - ${end.toLocaleDateString("en-US", opts)}`;
}

function formatTimeRange(startTime: string, endTime: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };
  const start = new Date(startTime);
  const end = new Date(endTime);
  return `${start.toLocaleTimeString("en-US", opts)} - ${end.toLocaleTimeString("en-US", opts)}`;
}

export function buildSlides(input: BuildSlidesInput): SlideData[] {
  const { config, event, announcements, upcomingSessions, sponsors, activePolls, customSlides, baseUrl } = input;
  const slides: SlideData[] = [];

  const orgSlug = event.organization?.slug;
  const eventUrl = orgSlug ? `${baseUrl}/${orgSlug}/${event.slug}` : `${baseUrl}/${event.slug}`;

  // 1. Event overview
  if (config.show_event_overview) {
    slides.push({
      type: "event_overview",
      title: event.title,
      body: formatDateRange(event.start_date, event.end_date),
      meta: event.location_name ?? undefined,
      qrUrl: eventUrl,
      qrLabel: "Scan to join",
    });
  }

  // 2. Announcements
  if (config.show_announcements) {
    for (const ann of announcements) {
      slides.push({
        type: "announcement",
        title: ann.subject,
        body: stripHtml(ann.body),
      });
    }
  }

  // 3. Upcoming sessions
  if (config.show_upcoming_sessions) {
    for (const session of upcomingSessions) {
      const speakerNames = session.session_speakers?.map((ss) => ss.speakers.name) ?? [];
      slides.push({
        type: "session",
        title: session.title,
        body: formatTimeRange(session.start_time, session.end_time),
        meta: session.location ?? undefined,
        speakers: speakerNames.length > 0 ? speakerNames : undefined,
      });
    }
  }

  // 4. Sponsors (batched in groups of 4)
  if (config.show_sponsors && sponsors.length > 0) {
    const BATCH_SIZE = 4;
    for (let i = 0; i < sponsors.length; i += BATCH_SIZE) {
      const batch = sponsors.slice(i, i + BATCH_SIZE);
      if (batch.length === 1) {
        const s = batch[0];
        slides.push({
          type: "sponsor",
          title: s.name,
          logoUrl: s.logo ?? undefined,
          meta: s.tier?.name,
        });
      } else {
        slides.push({
          type: "sponsor",
          title: "Thank You to Our Sponsors",
          body: batch.map((s) => s.name).join(" \u00B7 "),
        });
      }
    }
  }

  // 5. Active polls
  if (config.show_polls) {
    for (const poll of activePolls) {
      slides.push({
        type: "poll",
        title: poll.question,
        qrUrl: `${eventUrl}/polls`,
        qrLabel: "Scan to vote",
      });
    }
  }

  // 6. Custom slides (only enabled ones, sorted by display_order)
  if (config.show_custom_slides) {
    const enabled = customSlides
      .filter((s) => s.enabled)
      .sort((a, b) => a.display_order - b.display_order);

    for (const slide of enabled) {
      slides.push({
        type: "custom",
        title: slide.title,
        body: slide.body ?? undefined,
        bgColor: slide.bg_color,
      });
    }
  }

  return slides;
}
