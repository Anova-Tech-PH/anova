import type { Section } from "../../types";
import type { LogisticsItem } from "@/features/logistics/queries";

interface VenueSectionProps {
  section: Section;
  logistics: {
    venue_description: string;
    venue_map_url: string;
    items: LogisticsItem[];
  };
}

export function VenueSection({ section, logistics }: VenueSectionProps) {
  const title = (section.content.title as string) || "Venue & Logistics";
  const { venue_description, venue_map_url, items } = logistics;

  const hasContent = venue_description || venue_map_url || items.length > 0;

  if (!hasContent) return null;

  const isGoogleEmbed =
    venue_map_url.includes("google.com/maps/embed") ||
    venue_map_url.includes("maps.google.com/embed");

  return (
    <section className="bg-muted/30 px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-8 text-center text-2xl font-bold">{title}</h2>
        <div className="space-y-6">
          {venue_description && (
            <p className="whitespace-pre-wrap text-muted-foreground">
              {venue_description}
            </p>
          )}
          {venue_map_url && (
            <div>
              {isGoogleEmbed ? (
                <iframe
                  src={venue_map_url}
                  className="h-72 w-full rounded-xl border"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <a
                  href={venue_map_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium hover:underline"
                  style={{ color: "var(--website-primary)" }}
                >
                  View Map
                </a>
              )}
            </div>
          )}
          {items.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-lg border bg-card p-4">
                  <h4 className="font-medium">{item.title}</h4>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {item.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
