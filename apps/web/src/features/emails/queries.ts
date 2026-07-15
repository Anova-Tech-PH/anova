import { createClient } from "@/shared/utils/supabase/server";

export async function getEmailTemplatesByOrg(organizationId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getEmailLogsByEvent(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("email_logs")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return data;
}

export async function getEmailAutomationsByEvent(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("email_automations")
    .select("*, email_templates(name, subject)")
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  return data;
}

export async function getEmailStats(eventId: string) {
  const supabase = await createClient();

  const { data: logs, error } = await supabase
    .from("email_logs")
    .select("status")
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);

  const stats = {
    total: logs.length,
    sent: 0,
    delivered: 0,
    failed: 0,
    bounced: 0,
  };

  for (const log of logs) {
    if (log.status === "sent") stats.sent++;
    else if (log.status === "delivered") stats.delivered++;
    else if (log.status === "failed") stats.failed++;
    else if (log.status === "bounced") stats.bounced++;
  }

  return stats;
}
