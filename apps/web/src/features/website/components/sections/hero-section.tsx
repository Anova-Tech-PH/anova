import type { Section } from "../../types";

interface HeroSectionProps {
  section: Section;
}

export function HeroSection({ section }: HeroSectionProps) {
  const headline = (section.content.headline as string) || "";
  const subtitle = (section.content.subtitle as string) || "";

  return (
    <section
      className="relative overflow-hidden px-4 py-24 text-center sm:py-32"
      style={{
        background: `linear-gradient(135deg, var(--website-primary) 0%, color-mix(in srgb, var(--website-primary) 60%, #1e293b) 100%)`,
      }}
    >
      <div className="relative mx-auto max-w-3xl">
        {headline && (
          <h1 className="text-3xl font-bold text-white sm:text-5xl">
            {headline}
          </h1>
        )}
        {subtitle && (
          <h2 className="mt-4 text-lg text-white/80 sm:text-xl">
            {subtitle}
          </h2>
        )}
      </div>
    </section>
  );
}
