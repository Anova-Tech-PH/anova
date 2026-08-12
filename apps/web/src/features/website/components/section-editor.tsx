"use client";

import { Input, Textarea, Button } from "@attendly/ui/components";
import { Plus, Trash2 } from "lucide-react";
import type { Section } from "../types";

interface SectionEditorProps {
  section: Section;
  onChange: (section: Section) => void;
}

export function SectionEditor({ section, onChange }: SectionEditorProps) {
  const updateContent = (key: string, value: unknown) => {
    onChange({ ...section, content: { ...section.content, [key]: value } });
  };

  switch (section.type) {
    case "hero":
      return (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Headline</label>
            <Input
              value={(section.content.headline as string) ?? ""}
              onChange={(e) => updateContent("headline", e.target.value)}
              placeholder="Your event headline"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Subtitle</label>
            <Input
              value={(section.content.subtitle as string) ?? ""}
              onChange={(e) => updateContent("subtitle", e.target.value)}
              placeholder="A short description"
            />
          </div>
        </div>
      );

    case "about":
      return (
        <div>
          <label className="mb-1 block text-sm font-medium">Body</label>
          <Textarea
            value={(section.content.body as string) ?? ""}
            onChange={(e) => updateContent("body", e.target.value)}
            placeholder="Tell attendees about this event..."
            rows={5}
          />
        </div>
      );

    case "speakers":
      return (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Section Title</label>
            <Input
              value={(section.content.title as string) ?? ""}
              onChange={(e) => updateContent("title", e.target.value)}
              placeholder="Featured Speakers"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={(section.content.featured_only as boolean) ?? true}
              onChange={(e) => updateContent("featured_only", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Show only featured speakers
          </label>
        </div>
      );

    case "agenda":
      return (
        <div>
          <label className="mb-1 block text-sm font-medium">Section Title</label>
          <Input
            value={(section.content.title as string) ?? ""}
            onChange={(e) => updateContent("title", e.target.value)}
            placeholder="Schedule"
          />
        </div>
      );

    case "sponsors":
      return (
        <div>
          <label className="mb-1 block text-sm font-medium">Section Title</label>
          <Input
            value={(section.content.title as string) ?? ""}
            onChange={(e) => updateContent("title", e.target.value)}
            placeholder="Our Sponsors"
          />
        </div>
      );

    case "venue":
      return (
        <div>
          <label className="mb-1 block text-sm font-medium">Section Title</label>
          <Input
            value={(section.content.title as string) ?? ""}
            onChange={(e) => updateContent("title", e.target.value)}
            placeholder="Venue & Logistics"
          />
        </div>
      );

    case "faq": {
      const items = (section.content.items as Array<{ question: string; answer: string }>) ?? [];
      return (
        <div className="space-y-3">
          <label className="block text-sm font-medium">FAQ Items</label>
          {items.map((item, i) => (
            <div key={i} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <Input
                    value={item.question}
                    onChange={(e) => {
                      const updated = [...items];
                      updated[i] = { ...updated[i], question: e.target.value };
                      updateContent("items", updated);
                    }}
                    placeholder="Question"
                  />
                  <Textarea
                    value={item.answer}
                    onChange={(e) => {
                      const updated = [...items];
                      updated[i] = { ...updated[i], answer: e.target.value };
                      updateContent("items", updated);
                    }}
                    placeholder="Answer"
                    rows={2}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const updated = items.filter((_, idx) => idx !== i);
                    updateContent("items", updated);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              updateContent("items", [...items, { question: "", answer: "" }]);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add FAQ Item
          </Button>
        </div>
      );
    }

    case "cta":
      return (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Heading Text</label>
            <Input
              value={(section.content.text as string) ?? ""}
              onChange={(e) => updateContent("text", e.target.value)}
              placeholder="Register Now"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Button Text</label>
            <Input
              value={(section.content.button_text as string) ?? ""}
              onChange={(e) => updateContent("button_text", e.target.value)}
              placeholder="Get Tickets"
            />
          </div>
        </div>
      );

    default:
      return <p className="text-sm text-muted-foreground">Unknown section type.</p>;
  }
}
