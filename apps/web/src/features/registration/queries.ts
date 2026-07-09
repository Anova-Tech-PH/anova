import { createClient } from "@/shared/utils/supabase/server";

export async function getRegistrationsByEvent(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("registrations")
    .select("*, ticket_types(name, type, price)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getRegistrationStats(eventId: string) {
  const supabase = await createClient();

  const { data: registrations } = await supabase
    .from("registrations")
    .select("status")
    .eq("event_id", eventId);

  const stats = {
    total: registrations?.length ?? 0,
    confirmed: 0,
    checked_in: 0,
    cancelled: 0,
  };

  for (const r of registrations ?? []) {
    if (r.status === "confirmed") stats.confirmed++;
    if (r.status === "checked_in") stats.checked_in++;
    if (r.status === "cancelled") stats.cancelled++;
  }

  return stats;
}
