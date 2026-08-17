"use server";

import { createClient } from "@attendly/ui/supabase/server";
import type { ProfileFrame } from "./constants";

export type { ProfileFrame } from "./constants";

export async function getProfileFrames(eventId: string): Promise<ProfileFrame[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profile_photo_frames")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}
