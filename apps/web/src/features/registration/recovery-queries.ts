import { createClient } from "@attendly/ui/supabase/server";

export async function getRecoverySettings(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("recovery_enabled, recovery_delay_hours, recovery_email_count")
    .eq("id", eventId)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getRecoveryStats(eventId: string) {
  const supabase = await createClient();
  const { data: intents, error } = await supabase
    .from("registration_intents")
    .select("status, recovery_emails_sent")
    .eq("event_id", eventId);
  if (error) throw new Error(error.message);

  const stats = {
    total: intents.length,
    pending: 0,
    converted: 0,
    expired: 0,
    emailsSent: 0,
  };
  for (const intent of intents) {
    if (intent.status === "pending") stats.pending++;
    else if (intent.status === "converted") stats.converted++;
    else if (intent.status === "expired") stats.expired++;
    stats.emailsSent += intent.recovery_emails_sent;
  }
  return stats;
}
