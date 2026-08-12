import type { Section } from "../../types";
import type { LogisticsData } from "@/features/logistics/queries";

interface VenueSectionProps {
  section: Section;
  logistics: {
    venue_description: string;
    venue_map_url: string;
    logistics: LogisticsData;
  };
}

export function VenueSection({ section, logistics }: VenueSectionProps) {
  const title = (section.content.title as string) || "Venue & Logistics";
  const { venue_description, venue_map_url, logistics: data } = logistics;

  const hasParking = data.parking?.body;
  const hasTransportation = data.transportation?.body;
  const hasWifi = data.wifi?.network;
  const hasContent = venue_description || venue_map_url || hasParking || hasTransportation || hasWifi;

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
          <div className="grid gap-4 sm:grid-cols-3">
            {hasParking && (
              <div className="rounded-lg border bg-card p-4">
                <h4 className="font-medium">Parking</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.parking!.body}
                </p>
              </div>
            )}
            {hasTransportation && (
              <div className="rounded-lg border bg-card p-4">
                <h4 className="font-medium">Transportation</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.transportation!.body}
                </p>
              </div>
            )}
            {hasWifi && (
              <div className="rounded-lg border bg-card p-4">
                <h4 className="font-medium">WiFi</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Network: <span className="font-mono">{data.wifi!.network}</span>
                  {data.wifi!.password && (
                    <>
                      <br />
                      Password: <span className="font-mono">{data.wifi!.password}</span>
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
