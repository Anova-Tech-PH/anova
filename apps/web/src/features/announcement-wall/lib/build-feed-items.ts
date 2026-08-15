import { stripHtml } from "./build-slides";

export type FeedItem = {
  id: string;
  type: "announcement" | "session" | "sponsor" | "poll" | "custom";
  title: string;
  body?: string;
  meta?: string;
  speakers?: string[];
  logoUrl?: string;
  bgColor?: string;
  sortKey: number;
};

export type BuildFeedInput = {
  config: {
    show_announcements: boolean;
    show_upcoming_sessions: boolean;
    show_sponsors: boolean;
    show_polls: boolean;
    show_custom_slides: boolean;
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
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function buildFeedItems(input: BuildFeedInput): FeedItem[] {
  const { config } = input;
  const items: FeedItem[] = [];

  // Sessions (soonest first — lowest sortKey = first)
  if (config.show_upcoming_sessions) {
    for (const session of input.upcomingSessions) {
      const speakers =
        session.session_speakers?.map((ss) => ss.speakers.name) ?? [];
      items.push({
        id: session.id,
        type: "session",
        title: session.title,
        body: `${formatTime(session.start_time)} – ${formatTime(session.end_time)}`,
        meta: session.location ?? undefined,
        speakers: speakers.length > 0 ? speakers : undefined,
        sortKey: new Date(session.start_time).getTime(),
      });
    }
  }

  // Announcements (newest first — use negative timestamp so desc)
  if (config.show_announcements) {
    for (const ann of input.announcements) {
      items.push({
        id: ann.id,
        type: "announcement",
        title: ann.subject,
        body: stripHtml(ann.body),
        sortKey: -new Date(ann.sent_at).getTime(),
      });
    }
  }

  // Sponsors (by tier sort_order)
  if (config.show_sponsors) {
    for (const sponsor of input.sponsors) {
      items.push({
        id: sponsor.id,
        type: "sponsor",
        title: sponsor.name,
        meta: sponsor.tier?.name,
        logoUrl: sponsor.logo ?? undefined,
        sortKey: sponsor.tier?.sort_order ?? 999,
      });
    }
  }

  // Polls
  if (config.show_polls) {
    for (const poll of input.activePolls) {
      items.push({
        id: poll.id,
        type: "poll",
        title: poll.question,
        body: "Cast your vote!",
        sortKey: 0,
      });
    }
  }

  // Custom slides (enabled only, by display_order)
  if (config.show_custom_slides) {
    for (const slide of input.customSlides.filter((s) => s.enabled)) {
      items.push({
        id: slide.id,
        type: "custom",
        title: slide.title,
        body: slide.body ?? undefined,
        bgColor: slide.bg_color,
        sortKey: slide.display_order,
      });
    }
  }

  // Sort: sessions first (positive timestamps, ascending),
  // then announcements (negative timestamps, ascending = newest first),
  // then others by their sortKey
  items.sort((a, b) => {
    const priority = {
      session: 0,
      announcement: 1,
      poll: 2,
      sponsor: 3,
      custom: 4,
    };
    const pa = priority[a.type];
    const pb = priority[b.type];
    if (pa !== pb) return pa - pb;
    return a.sortKey - b.sortKey;
  });

  return items;
}
