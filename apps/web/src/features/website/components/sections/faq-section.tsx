"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Section } from "../../types";

interface FaqSectionProps {
  section: Section;
}

export function FaqSection({ section }: FaqSectionProps) {
  const items = (section.content.items as Array<{ question: string; answer: string }>) ?? [];
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <section className="px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-8 text-center text-2xl font-bold">
          Frequently Asked Questions
        </h2>
        <div className="divide-y rounded-xl border">
          {items.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={i}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-5 py-4 text-left font-medium transition-colors hover:text-primary"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                >
                  {item.question}
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-sm text-muted-foreground">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
