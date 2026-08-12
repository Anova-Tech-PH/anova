"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateRecoverySettings(
  eventId: string,
  settings: {
    recovery_enabled: boolean;
    recovery_delay_hours: number;
    recovery_email_count: number;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("events")
    .update({
      recovery_enabled: settings.recovery_enabled,
      recovery_delay_hours: settings.recovery_delay_hours,
      recovery_email_count: Math.min(3, Math.max(1, settings.recovery_email_count)),
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/marketing`);
}
