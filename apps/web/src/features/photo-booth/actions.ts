"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";
import type { BoothFrame } from "./constants";

export async function createBoothFrame(
  eventId: string,
  template: string,
  message: string,
  color: string
): Promise<BoothFrame> {
  const supabase = await createClient();

  // Get next sort_order
  const { data: existing } = await supabase
    .from("photo_booth_frames")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("photo_booth_frames")
    .insert({
      event_id: eventId,
      template,
      message,
      color,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
  return data;
}

export async function updateBoothFrame(
  frameId: string,
  updates: { message?: string; color?: string; template?: string }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("photo_booth_frames")
    .update(updates)
    .eq("id", frameId);

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

export async function deleteBoothFrame(frameId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("photo_booth_frames")
    .delete()
    .eq("id", frameId);

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

export async function reorderBoothFrames(eventId: string, orderedIds: string[]) {
  const supabase = await createClient();

  const updates = orderedIds.map((id, index) =>
    supabase
      .from("photo_booth_frames")
      .update({ sort_order: index })
      .eq("id", id)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  revalidatePath("/", "layout");
}
