"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function setProfileFrame(eventId: string, frameId: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("attendee_profiles")
    .update({ profile_frame_id: frameId })
    .eq("event_id", eventId)
    .eq("id", user.id);

  if (error) throw error;
  revalidatePath("/", "layout");
}
