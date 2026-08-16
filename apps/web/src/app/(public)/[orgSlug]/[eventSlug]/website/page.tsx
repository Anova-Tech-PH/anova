import { notFound } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { WebsiteRenderer } from "@/features/website/components/website-renderer";
import type { WebsiteConfig } from "@/features/website/types";
import { getLogisticsItems } from "@/features/logistics/queries";

export default async function PublicWebsitePage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const supabase = await createClient();

  // Lookup org
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  if (!org) notFound();

  // Lookup event
  const { data: event } = await supabase
    .from("events")
    .select("id, title, website_config, venue_description, venue_map_url")
    .eq("organization_id", org.id)
    .eq("slug", eventSlug)
    .eq("status", "published")
    .single();

  if (!event) notFound();

  const config = (event.website_config ?? {}) as WebsiteConfig;

  if (!config.enabled) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Event website is not available yet</h1>
          <p className="mt-2 text-muted-foreground">
            Check back later for more information about this event.
          </p>
        </div>
      </div>
    );
  }

  // Fetch all data sections might need
  const [speakersResult, sessionsResult, tiersResult, sponsorsResult, logisticsItems] = await Promise.all([
    supabase
      .from("speakers")
      .select("id, name, title, company, photo, is_featured")
      .eq("event_id", event.id)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name"),
    supabase
      .from("sessions")
      .select(`
        id, title, start_time, end_time,
        session_speakers(speaker_id, speakers(id, name))
      `)
      .eq("event_id", event.id)
      .order("start_time"),
    supabase
      .from("sponsor_tiers")
      .select("*")
      .eq("event_id", event.id)
      .order("sort_order"),
    supabase
      .from("sponsors")
      .select("id, name, logo, tier_id")
      .eq("event_id", event.id)
      .order("sort_order"),
    getLogisticsItems(event.id),
  ]);

  const speakers = speakersResult.data ?? [];
  const sessions = sessionsResult.data ?? [];
  const tiers = tiersResult.data ?? [];
  const sponsors = sponsorsResult.data ?? [];

  // Group sponsors by tier
  const sponsorGroups: Array<{
    tier: { id: string; name: string; sort_order: number; logo_size: string } | null;
    sponsors: typeof sponsors;
  }> = [];

  for (const tier of tiers) {
    const tierSponsors = sponsors.filter((s) => s.tier_id === tier.id);
    if (tierSponsors.length > 0) {
      sponsorGroups.push({ tier, sponsors: tierSponsors });
    }
  }

  const untiered = sponsors.filter((s) => s.tier_id === null);
  if (untiered.length > 0) {
    sponsorGroups.push({ tier: null, sponsors: untiered });
  }

  const basePath = `/${orgSlug}/${eventSlug}`;

  return (
    <WebsiteRenderer
      config={config}
      eventData={{
        speakers,
        sessions,
        sponsorGroups,
        logistics: {
          venue_description: event.venue_description ?? "",
          venue_map_url: event.venue_map_url ?? "",
          items: logisticsItems,
        },
        basePath,
        registerUrl: `/register${basePath}`,
      }}
    />
  );
}
