import { getTiersByEvent } from "@/features/sponsors/tier-queries";
import { getSponsorsByEvent } from "@/features/sponsors/queries";
import { TierManager } from "@/features/sponsors/components/tier-manager";
import { SponsorList } from "@/features/sponsors/components/sponsor-list";

export default async function SponsorsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const [tiers, sponsors] = await Promise.all([
    getTiersByEvent(eventId),
    getSponsorsByEvent(eventId),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Sponsors &amp; Exhibitors</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage sponsor tiers, sponsor profiles, booth settings, and promotional materials.
        </p>
      </div>

      <TierManager eventId={eventId} initialTiers={tiers} />

      <SponsorList eventId={eventId} initialSponsors={sponsors} tiers={tiers} />
    </div>
  );
}
