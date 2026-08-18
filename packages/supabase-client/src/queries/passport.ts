import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Get sponsors that participate in the exhibitor passport for an event.
 * Only returns sponsors with booth_enabled = true.
 */
export async function getPassportSponsors(
  client: SupabaseClient,
  eventId: string
) {
  const { data, error } = await client
    .from("sponsors")
    .select("id, name, logo, description, booth_enabled, sort_order, tier:sponsor_tiers(id, name)")
    .eq("event_id", eventId)
    .eq("booth_enabled", true)
    .order("sort_order");

  if (error) return [];
  return data ?? [];
}

/**
 * Get the passport stamps a user has collected at an event.
 */
export async function getPassportStamps(
  client: SupabaseClient,
  eventId: string,
  userId: string
) {
  const { data, error } = await client
    .from("exhibitor_passport_stamps")
    .select("id, exhibitor_id, checked_in_at")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .order("checked_in_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

/**
 * Get passport progress summary: how many stamps collected vs total booths.
 */
export async function getPassportProgress(
  client: SupabaseClient,
  eventId: string,
  userId: string
) {
  const [sponsors, stamps] = await Promise.all([
    getPassportSponsors(client, eventId),
    getPassportStamps(client, eventId, userId),
  ]);

  return {
    collected: stamps.length,
    total: sponsors.length,
  };
}
