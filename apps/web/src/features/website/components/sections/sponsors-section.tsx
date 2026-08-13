import type { Section } from "../../types";

interface Sponsor {
  id: string;
  name: string;
  logo: string | null;
  tier_id: string | null;
}

interface SponsorTier {
  id: string;
  name: string;
  sort_order: number;
  logo_size: string;
}

interface SponsorGroup {
  tier: SponsorTier | null;
  sponsors: Sponsor[];
}

interface SponsorsSectionProps {
  section: Section;
  sponsorGroups: SponsorGroup[];
  basePath: string;
}

export function SponsorsSection({ section, sponsorGroups, basePath }: SponsorsSectionProps) {
  const title = (section.content.title as string) || "Our Sponsors";

  const hasSponsors = sponsorGroups.some((g) => g.sponsors.length > 0);
  if (!hasSponsors) return null;

  return (
    <section className="px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-8 text-center text-2xl font-bold">{title}</h2>
        <div className="space-y-10">
          {sponsorGroups.map((group) => {
            if (group.sponsors.length === 0) return null;
            const tierName = group.tier?.name ?? "Sponsors";
            const logoSize = group.tier?.logo_size ?? "medium";
            const imgSize =
              logoSize === "large" ? "h-24 w-24" :
              logoSize === "small" ? "h-12 w-12" : "h-16 w-16";

            return (
              <div key={group.tier?.id ?? "untiered"}>
                <h3 className="mb-4 text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {tierName}
                </h3>
                <div className="flex flex-wrap items-center justify-center gap-6">
                  {group.sponsors.map((sponsor) => (
                    <a
                      key={sponsor.id}
                      href={`${basePath}/sponsors/${sponsor.id}`}
                      className="group flex flex-col items-center transition-transform hover:scale-105"
                    >
                      {sponsor.logo ? (
                        <img
                          src={sponsor.logo}
                          alt={sponsor.name}
                          className={`${imgSize} rounded-lg object-contain`}
                        />
                      ) : (
                        <div
                          className={`${imgSize} flex items-center justify-center rounded-lg bg-primary/10`}
                        >
                          <span className="text-lg font-bold" style={{ color: "var(--website-primary)" }}>
                            {sponsor.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="mt-2 text-xs text-muted-foreground group-hover:text-foreground">
                        {sponsor.name}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
