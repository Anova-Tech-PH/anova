import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSponsorById, getSponsorLeads } from "@/features/sponsors/queries";
import { getTiersByEvent } from "@/features/sponsors/tier-queries";
import { SponsorDetailPanel } from "@/features/sponsors/components/sponsor-detail-panel";
import { createClient } from "@attendly/ui/supabase/server";

export default async function SponsorDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventId: string; sponsorId: string }>;
}) {
  const { orgSlug, eventId, sponsorId } = await params;

  const [sponsor, leads, tiers] = await Promise.all([
    getSponsorById(sponsorId),
    getSponsorLeads(sponsorId),
    getTiersByEvent(eventId),
  ]);

  // Get analytics counts via direct queries
  const supabase = await createClient();

  const [{ count: visitCount }, { count: leadCount }] = await Promise.all([
    supabase
      .from("booth_visits")
      .select("*", { count: "exact", head: true })
      .eq("sponsor_id", sponsorId),
    supabase
      .from("sponsor_leads")
      .select("*", { count: "exact", head: true })
      .eq("sponsor_id", sponsorId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/org/${orgSlug}/events/${eventId}/sponsors`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sponsors
        </Link>
      </div>

      <div>
        <h2 className="text-lg font-semibold">{sponsor.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage details, documents, coupons, and leads for this sponsor.
        </p>
      </div>

      <SponsorDetailPanel
        eventId={eventId}
        sponsor={sponsor}
        leads={leads}
        tiers={tiers}
        analytics={{
          visit_count: visitCount ?? 0,
          lead_count: leadCount ?? 0,
        }}
      />
    </div>
  );
}
