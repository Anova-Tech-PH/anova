import type { Section } from "../../types";

interface Speaker {
  id: string;
  name: string;
  title?: string | null;
  company?: string | null;
  photo?: string | null;
  is_featured?: boolean;
}

interface SpeakersSectionProps {
  section: Section;
  speakers: Speaker[];
  basePath: string;
}

export function SpeakersSection({ section, speakers, basePath }: SpeakersSectionProps) {
  const title = (section.content.title as string) || "Featured Speakers";
  const featuredOnly = (section.content.featured_only as boolean) ?? true;

  const filtered = featuredOnly
    ? speakers.filter((s) => s.is_featured)
    : speakers;

  if (filtered.length === 0) return null;

  return (
    <section className="px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-8 text-center text-2xl font-bold">{title}</h2>
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((speaker) => (
            <a
              key={speaker.id}
              href={`${basePath}/speakers/${speaker.id}`}
              className="group flex flex-col items-center rounded-xl border bg-card p-5 text-center transition-all hover:shadow-md"
            >
              {speaker.photo ? (
                <img
                  src={speaker.photo}
                  alt={speaker.name}
                  className="mb-3 h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-xl font-bold" style={{ color: "var(--website-primary)" }}>
                    {speaker.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <h3 className="font-medium group-hover:text-primary transition-colors">
                {speaker.name}
              </h3>
              {speaker.title && (
                <p className="mt-0.5 text-sm text-muted-foreground">{speaker.title}</p>
              )}
              {speaker.company && (
                <p className="text-xs text-muted-foreground">{speaker.company}</p>
              )}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
