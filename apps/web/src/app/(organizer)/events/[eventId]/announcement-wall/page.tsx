import { createClient } from "@attendly/ui/supabase/server";
import {
  getWallConfig,
  getDefaultConfig,
  getAllCustomSlides,
} from "@/features/announcement-wall/queries";
import { WallConfigClient } from "./wall-config-client";

export default async function AnnouncementWallPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select(
      "slug, organization:organizations(slug)"
    )
    .eq("id", eventId)
    .single();

  const orgSlug = (event?.organization as unknown as { slug: string })?.slug;
  const eventSlug = event?.slug;
  const wallUrl =
    orgSlug && eventSlug ? `/${orgSlug}/${eventSlug}/wall` : null;

  const [config, customSlides] = await Promise.all([
    getWallConfig(eventId),
    getAllCustomSlides(eventId),
  ]);

  const defaults = getDefaultConfig();

  return (
    <WallConfigClient
      eventId={eventId}
      config={config}
      defaults={defaults}
      customSlides={customSlides}
      wallUrl={wallUrl}
    />
  );
}
