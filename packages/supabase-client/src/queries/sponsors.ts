import type { SupabaseClient } from "@supabase/supabase-js";

export async function getSponsorsByEvent(client: SupabaseClient, eventId: string) {
  const { data, error } = await client
    .from("sponsors")
    .select("*, tier:sponsor_tiers(*)")
    .eq("event_id", eventId)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getSponsorsByTier(client: SupabaseClient, eventId: string) {
  const { data: tiers, error: tiersError } = await client
    .from("sponsor_tiers")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order");

  if (tiersError) throw new Error(tiersError.message);

  const { data: sponsors, error: sponsorsError } = await client
    .from("sponsors")
    .select("*, tier:sponsor_tiers(*)")
    .eq("event_id", eventId)
    .order("sort_order");

  if (sponsorsError) throw new Error(sponsorsError.message);

  const groups: { tier: unknown; sponsors: unknown[] }[] = [];

  for (const tier of tiers ?? []) {
    groups.push({
      tier,
      sponsors: ((sponsors ?? []) as { tier_id: string | null }[]).filter(
        (s) => s.tier_id === (tier as { id: string }).id
      ),
    });
  }

  const untiered = ((sponsors ?? []) as { tier_id: string | null }[]).filter(
    (s) => s.tier_id === null
  );
  if (untiered.length > 0) {
    groups.push({ tier: null, sponsors: untiered });
  }

  return groups;
}

export async function getSponsorDetail(client: SupabaseClient, sponsorId: string) {
  const { data, error } = await client
    .from("sponsors")
    .select("*, tier:sponsor_tiers(*), sponsor_documents(*), sponsor_coupons(*)")
    .eq("id", sponsorId)
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Sponsor not found");

  return {
    ...data,
    documents: Array.isArray(data.sponsor_documents) ? data.sponsor_documents : [],
    coupons: Array.isArray(data.sponsor_coupons) ? data.sponsor_coupons : [],
    sponsor_documents: undefined,
    sponsor_coupons: undefined,
  };
}
