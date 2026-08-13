import type { Section } from "../../types";

interface CtaSectionProps {
  section: Section;
  registerUrl: string;
}

export function CtaSection({ section, registerUrl }: CtaSectionProps) {
  const text = (section.content.text as string) || "Register Now";
  const buttonText = (section.content.button_text as string) || "Get Tickets";

  return (
    <section
      className="px-4 py-20 text-center"
      style={{ backgroundColor: "var(--website-primary)" }}
    >
      <div className="mx-auto max-w-2xl">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">{text}</h2>
        <a
          href={registerUrl}
          className="mt-6 inline-block rounded-lg bg-white px-8 py-3 text-sm font-semibold transition-transform hover:scale-105"
          style={{ color: "var(--website-primary)" }}
        >
          {buttonText}
        </a>
      </div>
    </section>
  );
}
