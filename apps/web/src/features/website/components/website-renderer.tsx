import type { WebsiteConfig } from "../types";
import type { LogisticsItem } from "@/features/logistics/queries";
import { HeroSection } from "./sections/hero-section";
import { AboutSection } from "./sections/about-section";
import { SpeakersSection } from "./sections/speakers-section";
import { AgendaSection } from "./sections/agenda-section";
import { SponsorsSection } from "./sections/sponsors-section";
import { VenueSection } from "./sections/venue-section";
import { FaqSection } from "./sections/faq-section";
import { CtaSection } from "./sections/cta-section";

interface Speaker {
  id: string;
  name: string;
  title?: string | null;
  company?: string | null;
  photo?: string | null;
  is_featured?: boolean;
}

interface Session {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  session_speakers?: Array<{
    speakers: { id: string; name: string } | { id: string; name: string }[] | null;
  }>;
}

interface SponsorGroup {
  tier: { id: string; name: string; sort_order: number; logo_size: string } | null;
  sponsors: Array<{ id: string; name: string; logo: string | null; tier_id: string | null }>;
}

interface EventData {
  speakers: Speaker[];
  sessions: Session[];
  sponsorGroups: SponsorGroup[];
  logistics: {
    venue_description: string;
    venue_map_url: string;
    items: LogisticsItem[];
  };
  basePath: string;
  registerUrl: string;
}

interface WebsiteRendererProps {
  config: WebsiteConfig;
  eventData: EventData;
}

export function WebsiteRenderer({ config, eventData }: WebsiteRendererProps) {
  const visibleSections = config.sections.filter((s) => s.visible);

  return (
    <div
      style={
        {
          "--website-primary": config.theme.primary_color,
          fontFamily: config.theme.font,
        } as React.CSSProperties
      }
    >
      {config.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: config.custom_css }} />
      )}

      {visibleSections.map((section) => {
        switch (section.type) {
          case "hero":
            return <HeroSection key="hero" section={section} />;
          case "about":
            return <AboutSection key="about" section={section} />;
          case "speakers":
            return (
              <SpeakersSection
                key="speakers"
                section={section}
                speakers={eventData.speakers}
                basePath={eventData.basePath}
              />
            );
          case "agenda":
            return (
              <AgendaSection
                key="agenda"
                section={section}
                sessions={eventData.sessions}
                basePath={eventData.basePath}
              />
            );
          case "sponsors":
            return (
              <SponsorsSection
                key="sponsors"
                section={section}
                sponsorGroups={eventData.sponsorGroups}
                basePath={eventData.basePath}
              />
            );
          case "venue":
            return (
              <VenueSection
                key="venue"
                section={section}
                logistics={eventData.logistics}
              />
            );
          case "faq":
            return <FaqSection key="faq" section={section} />;
          case "cta":
            return (
              <CtaSection
                key="cta"
                section={section}
                registerUrl={eventData.registerUrl}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
