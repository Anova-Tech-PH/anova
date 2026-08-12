"use client";

import { useState, useTransition } from "react";
import { Button, Textarea } from "@attendly/ui/components";
import {
  Eye, EyeOff, ChevronUp, ChevronDown,
  Globe, FileText, Users, Calendar, Award,
  MapPin, HelpCircle, MousePointerClick, Megaphone,
  Save, ExternalLink,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Section, SectionType, WebsiteConfig } from "../types";
import { updateWebsiteConfig, toggleWebsite } from "../actions";
import { SectionEditor } from "./section-editor";
import { ThemePicker } from "./theme-picker";

const sectionMeta: Record<SectionType, { label: string; icon: LucideIcon }> = {
  hero: { label: "Hero Banner", icon: Megaphone },
  about: { label: "About", icon: FileText },
  speakers: { label: "Speakers", icon: Users },
  agenda: { label: "Agenda", icon: Calendar },
  sponsors: { label: "Sponsors", icon: Award },
  venue: { label: "Venue", icon: MapPin },
  faq: { label: "FAQ", icon: HelpCircle },
  cta: { label: "Call to Action", icon: MousePointerClick },
};

interface WebsiteEditorProps {
  eventId: string;
  initialConfig: WebsiteConfig;
  previewUrl?: string;
}

export function WebsiteEditor({ eventId, initialConfig, previewUrl }: WebsiteEditorProps) {
  const [config, setConfig] = useState<WebsiteConfig>(initialConfig);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const next = !config.enabled;
    setConfig((prev) => ({ ...prev, enabled: next }));
    startTransition(async () => {
      await toggleWebsite(eventId, next);
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      await updateWebsiteConfig(eventId, config);
    });
  };

  const handleSectionChange = (index: number, section: Section) => {
    setConfig((prev) => {
      const sections = [...prev.sections];
      sections[index] = section;
      return { ...prev, sections };
    });
  };

  const handleVisibilityToggle = (index: number) => {
    setConfig((prev) => {
      const sections = [...prev.sections];
      sections[index] = { ...sections[index], visible: !sections[index].visible };
      return { ...prev, sections };
    });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setConfig((prev) => {
      const sections = [...prev.sections];
      [sections[index - 1], sections[index]] = [sections[index], sections[index - 1]];
      return { ...prev, sections };
    });
    if (expandedIndex === index) setExpandedIndex(index - 1);
    else if (expandedIndex === index - 1) setExpandedIndex(index);
  };

  const handleMoveDown = (index: number) => {
    if (index >= config.sections.length - 1) return;
    setConfig((prev) => {
      const sections = [...prev.sections];
      [sections[index], sections[index + 1]] = [sections[index + 1], sections[index]];
      return { ...prev, sections };
    });
    if (expandedIndex === index) setExpandedIndex(index + 1);
    else if (expandedIndex === index + 1) setExpandedIndex(index);
  };

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Event Website</h2>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={handleToggle}
              className="h-4 w-4 rounded border-gray-300"
            />
            {config.enabled ? "Published" : "Disabled"}
          </label>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Preview
            </a>
          )}
          <Button onClick={handleSave} disabled={isPending} size="sm">
            <Save className="mr-1.5 h-4 w-4" />
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Section list */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-muted-foreground">Sections</h3>
        <div className="divide-y rounded-lg border">
          {config.sections.map((section, index) => {
            const meta = sectionMeta[section.type];
            const Icon = meta?.icon ?? Globe;
            const isExpanded = expandedIndex === index;

            return (
              <div key={`${section.type}-${index}`}>
                <div className="flex items-center gap-2 px-3 py-2">
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <button
                    type="button"
                    className="flex-1 text-left text-sm font-medium hover:text-primary transition-colors"
                    onClick={() =>
                      setExpandedIndex(isExpanded ? null : index)
                    }
                  >
                    {meta?.label ?? section.type}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVisibilityToggle(index)}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title={section.visible ? "Hide section" : "Show section"}
                  >
                    {section.visible ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === config.sections.length - 1}
                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
                {isExpanded && (
                  <div className="border-t bg-muted/30 px-4 py-3">
                    <SectionEditor
                      section={section}
                      onChange={(updated) => handleSectionChange(index, updated)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Theme */}
      <ThemePicker
        theme={config.theme}
        onChange={(theme) => setConfig((prev) => ({ ...prev, theme }))}
      />

      {/* Custom CSS */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Custom CSS</h3>
        <Textarea
          value={config.custom_css}
          onChange={(e) =>
            setConfig((prev) => ({ ...prev, custom_css: e.target.value }))
          }
          placeholder="/* Add custom CSS here */"
          rows={4}
          className="font-mono text-xs"
        />
      </div>
    </div>
  );
}
