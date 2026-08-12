import { createClient } from "@attendly/ui/supabase/server";
import type { WebsiteConfig } from "./types";

const defaultConfig: WebsiteConfig = {
  enabled: false,
  sections: [
    { type: "hero", visible: true, content: { headline: "", subtitle: "" } },
    { type: "about", visible: true, content: { body: "" } },
    { type: "speakers", visible: true, content: { title: "Featured Speakers", featured_only: true } },
    { type: "agenda", visible: true, content: { title: "Schedule" } },
    { type: "sponsors", visible: true, content: { title: "Our Sponsors" } },
    { type: "venue", visible: true, content: { title: "Venue & Logistics" } },
    { type: "faq", visible: true, content: { items: [] } },
    { type: "cta", visible: true, content: { text: "Register Now", button_text: "Get Tickets" } },
  ],
  theme: { primary_color: "#0ea5e9", font: "Inter" },
  custom_css: "",
};

export async function getWebsiteConfig(eventId: string): Promise<WebsiteConfig> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("website_config")
    .eq("id", eventId)
    .single();

  if (error) throw new Error(error.message);

  const raw = data?.website_config as Partial<WebsiteConfig> | null;
  if (!raw) return defaultConfig;

  return {
    enabled: raw.enabled ?? defaultConfig.enabled,
    sections: raw.sections ?? defaultConfig.sections,
    theme: {
      primary_color: raw.theme?.primary_color ?? defaultConfig.theme.primary_color,
      font: raw.theme?.font ?? defaultConfig.theme.font,
    },
    custom_css: raw.custom_css ?? defaultConfig.custom_css,
  };
}
