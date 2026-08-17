"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";
import type { ProfileFrame } from "./constants";

export async function createProfileFrame(
  eventId: string,
  label: string,
  color: string
): Promise<ProfileFrame> {
  const supabase = await createClient();

  // Get next sort_order
  const { data: existing } = await supabase
    .from("profile_photo_frames")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("profile_photo_frames")
    .insert({
      event_id: eventId,
      label,
      color,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
  return data;
}

export async function updateProfileFrame(
  frameId: string,
  updates: { label?: string; color?: string }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("profile_photo_frames")
    .update(updates)
    .eq("id", frameId);

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

export async function deleteProfileFrame(frameId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("profile_photo_frames")
    .delete()
    .eq("id", frameId);

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

export async function reorderProfileFrames(eventId: string, orderedIds: string[]) {
  const supabase = await createClient();

  const updates = orderedIds.map((id, index) =>
    supabase
      .from("profile_photo_frames")
      .update({ sort_order: index })
      .eq("id", id)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  revalidatePath("/", "layout");
}
