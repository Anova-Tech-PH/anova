"use server";

import { createClient } from "@attendly/ui/supabase/server";
import type { BoothFrame } from "./constants";

export type { BoothFrame } from "./constants";
export { FRAME_TEMPLATES } from "./constants";

export async function getBoothFrames(eventId: string): Promise<BoothFrame[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("photo_booth_frames")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}
