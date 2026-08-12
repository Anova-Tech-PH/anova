"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";
import type { Section, SectionType, WebsiteConfig } from "./types";

export async function updateWebsiteConfig(
  eventId: string,
  config: Partial<WebsiteConfig>
) {
  const supabase = await createClient();

  // Fetch current config
  const { data: event, error: fetchError } = await supabase
    .from("events")
    .select("website_config")
    .eq("id", eventId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const current = (event.website_config ?? {}) as WebsiteConfig;
  const merged = { ...current, ...config, updated_at: undefined };

  const { error } = await supabase
    .from("events")
    .update({ website_config: merged, updated_at: new Date().toISOString() })
    .eq("id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/website`);
}

export async function updateSection(
  eventId: string,
  sectionIndex: number,
  section: Section
) {
  const supabase = await createClient();

  const { data: event, error: fetchError } = await supabase
    .from("events")
    .select("website_config")
    .eq("id", eventId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const config = (event.website_config ?? {}) as WebsiteConfig;
  const sections = [...(config.sections ?? [])];
  sections[sectionIndex] = section;

  const { error } = await supabase
    .from("events")
    .update({
      website_config: { ...config, sections },
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/website`);
}

export async function reorderSections(
  eventId: string,
  orderedTypes: SectionType[]
) {
  const supabase = await createClient();

  const { data: event, error: fetchError } = await supabase
    .from("events")
    .select("website_config")
    .eq("id", eventId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const config = (event.website_config ?? {}) as WebsiteConfig;
  const sectionMap = new Map(
    (config.sections ?? []).map((s) => [s.type, s])
  );

  const reordered = orderedTypes
    .map((type) => sectionMap.get(type))
    .filter(Boolean) as Section[];

  const { error } = await supabase
    .from("events")
    .update({
      website_config: { ...config, sections: reordered },
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/website`);
}

export async function toggleWebsite(eventId: string, enabled: boolean) {
  const supabase = await createClient();

  const { data: event, error: fetchError } = await supabase
    .from("events")
    .select("website_config")
    .eq("id", eventId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const config = (event.website_config ?? {}) as WebsiteConfig;

  const { error } = await supabase
    .from("events")
    .update({
      website_config: { ...config, enabled },
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/website`);
}
