"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function upsertWallConfig(
  eventId: string,
  data: {
    enabled?: boolean;
    rotation_speed?: number;
    theme?: string;
    show_event_overview?: boolean;
    show_announcements?: boolean;
    show_upcoming_sessions?: boolean;
    show_sponsors?: boolean;
    show_polls?: boolean;
    show_custom_slides?: boolean;
    session_lookahead_minutes?: number;
  }
) {
  const supabase = await createClient();

  // Check if config exists for this event
  const { data: existing } = await supabase
    .from("announcement_wall_config")
    .select("id")
    .eq("event_id", eventId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("announcement_wall_config")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("event_id", eventId);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("announcement_wall_config")
      .insert({ event_id: eventId, ...data });

    if (error) throw new Error(error.message);
  }

  revalidatePath(`/events/${eventId}/announcement-wall`);
}

export async function createCustomSlide(
  eventId: string,
  data: { title: string; body?: string; bg_color?: string }
) {
  const supabase = await createClient();

  // Get max display_order for this event
  const { data: slides } = await supabase
    .from("announcement_wall_slides")
    .select("display_order")
    .eq("event_id", eventId)
    .order("display_order", { ascending: false })
    .limit(1);

  const nextOrder = slides && slides.length > 0 ? slides[0].display_order + 1 : 0;

  const { data: slide, error } = await supabase
    .from("announcement_wall_slides")
    .insert({
      event_id: eventId,
      title: data.title,
      body: data.body ?? null,
      bg_color: data.bg_color ?? null,
      display_order: nextOrder,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/announcement-wall`);
  return slide;
}

export async function updateCustomSlide(
  slideId: string,
  eventId: string,
  data: {
    title?: string;
    body?: string;
    bg_color?: string;
    enabled?: boolean;
    display_order?: number;
  }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("announcement_wall_slides")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", slideId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/announcement-wall`);
}

export async function deleteCustomSlide(slideId: string, eventId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("announcement_wall_slides")
    .delete()
    .eq("id", slideId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/announcement-wall`);
}
