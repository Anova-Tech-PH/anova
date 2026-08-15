import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@attendly/ui/supabase/server";
import { getWallData } from "@/features/announcement-wall/queries";
import { buildSlides } from "@/features/announcement-wall/lib/build-slides";
import WallSlideshow from "@/features/announcement-wall/components/wall-slideshow";
import { WallRefreshWrapper } from "@/features/announcement-wall/components/wall-refresh-wrapper";

export default async function PublicWallPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const supabase = await createClient();

  // Resolve org
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();
  if (!org) notFound();

  // Resolve event (published only)
  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("organization_id", org.id)
    .eq("slug", eventSlug)
    .eq("status", "published")
    .single();
  if (!event) notFound();

  // Fetch all wall data
  const wallData = await getWallData(event.id);

  // Build base URL from headers
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${protocol}://${host}`;

  // Map wall data to buildSlides input
  const config = wallData.config;
  const wallEvent = wallData.event;

  const slides = buildSlides({
    config: {
      show_event_overview: config.show_event_overview,
      show_announcements: config.show_announcements,
      show_upcoming_sessions: config.show_upcoming_sessions,
      show_sponsors: config.show_sponsors,
      show_polls: config.show_polls,
      show_custom_slides: config.show_custom_slides,
    },
    event: {
      title: wallEvent?.title ?? event.title,
      slug: wallEvent?.slug ?? eventSlug,
      start_date: wallEvent?.start_date ?? "",
      end_date: wallEvent?.end_date ?? "",
      banner_url: wallEvent?.banner_url ?? null,
      location_name: wallEvent?.location_name ?? null,
      organization: wallEvent?.organizations
        ? { slug: (wallEvent.organizations as unknown as { slug: string }).slug }
        : { slug: orgSlug },
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
    baseUrl,
  });

  const rotationSpeed =
    "rotation_speed" in config ? config.rotation_speed : 10;
  const theme = "theme" in config ? config.theme : "dark";

  return (
    <div className="fixed inset-0 z-50">
      <WallRefreshWrapper intervalMs={60_000}>
        <WallSlideshow
          slides={slides}
          rotationSpeed={rotationSpeed}
          theme={theme}
          eventTitle={event.title}
        />
      </WallRefreshWrapper>
    </div>
  );
}
