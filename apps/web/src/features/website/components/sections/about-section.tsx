import type { Section } from "../../types";

interface AboutSectionProps {
  section: Section;
}

export function AboutSection({ section }: AboutSectionProps) {
  const body = (section.content.body as string) || "";

  if (!body) return null;

  return (
    <section className="px-4 py-16">
      <div className="prose mx-auto max-w-3xl">
        <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
          {body}
        </p>
      </div>
    </section>
  );
}
