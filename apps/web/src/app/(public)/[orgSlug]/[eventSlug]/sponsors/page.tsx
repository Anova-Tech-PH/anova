import { notFound } from "next/navigation";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";
import type { Sponsor } from "@/features/sponsors/queries";
import type { SponsorTier } from "@/features/sponsors/tier-queries";

type SponsorsByTierGroup = {
  tier: SponsorTier | null;
  sponsors: Sponsor[];
};

function gridColsForLogoSize(logoSize: string) {
  switch (logoSize) {
    case "large":
      return "grid-cols-1 sm:grid-cols-2";
    case "medium":
      return "grid-cols-1 sm:grid-cols-3";
    case "small":
      return "grid-cols-2 sm:grid-cols-4";
    default:
      return "grid-cols-1 sm:grid-cols-3";
  }
}

export default async function PublicSponsorsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
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

  // Fetch tiers ordered by sort_order
  const { data: tiers } = await supabase
    .from("sponsor_tiers")
    .select("*")
    .eq("event_id", event.id)
    .order("sort_order");

  // Fetch sponsors with tier join
  const { data: sponsors } = await supabase
    .from("sponsors")
    .select("*, tier:sponsor_tiers(*)")
    .eq("event_id", event.id)
    .order("sort_order");

  // Group sponsors by tier
  const groups: SponsorsByTierGroup[] = [];

  for (const tier of tiers ?? []) {
    const tierSponsors = ((sponsors ?? []) as Sponsor[]).filter(
      (s) => s.tier_id === tier.id
    );
    if (tierSponsors.length > 0) {
      groups.push({ tier: tier as SponsorTier, sponsors: tierSponsors });
    }
  }

  // Sponsors without a tier
  const untiered = ((sponsors ?? []) as Sponsor[]).filter(
    (s) => s.tier_id === null
  );
  if (untiered.length > 0) {
    groups.push({ tier: null, sponsors: untiered });
  }

  const basePath = `/${orgSlug}/${eventSlug}/sponsors`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{event.title} — Sponsors</h1>

      {groups.length === 0 ? (
        <div className="mt-12 rounded-lg border border-dashed p-12 text-center">
          <Building2 className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">
            No sponsors have been added yet.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-12">
          {groups.map((group) => {
            const tierName = group.tier?.name ?? "Other Sponsors";
            const logoSize = group.tier?.logo_size ?? "medium";

            return (
              <section key={group.tier?.id ?? "untiered"}>
                <h2 className="mb-6 text-lg font-semibold">{tierName}</h2>
                <div className={`grid gap-4 ${gridColsForLogoSize(logoSize)}`}>
                  {group.sponsors.map((sponsor) => (
                    <Link
                      key={sponsor.id}
                      href={`${basePath}/${sponsor.id}`}
                      className="group flex flex-col items-center rounded-xl border bg-card p-6 text-center transition-all hover:shadow-md"
                    >
                      {sponsor.logo ? (
                        <img
                          src={sponsor.logo}
                          alt={sponsor.name}
                          className="mb-4 h-20 w-20 rounded-lg object-contain"
                        />
                      ) : (
                        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-lg bg-primary/10">
                          <span className="text-2xl font-bold text-primary">
                            {sponsor.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <h3 className="font-medium group-hover:text-primary transition-colors">
                        {sponsor.name}
                      </h3>
                      {sponsor.description && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {sponsor.description}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
