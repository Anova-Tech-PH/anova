import { createClient } from "@attendly/ui/supabase/server";
import type { SponsorTier } from "./tier-queries";

export type Sponsor = {
  id: string;
  event_id: string;
  tier_id: string | null;
  name: string;
  logo: string | null;
  description: string | null;
  website_url: string | null;
  promo_video_url: string | null;
  booth_enabled: boolean;
  contact_email: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  tier?: SponsorTier;
};

export type SponsorDocument = {
  id: string;
  sponsor_id: string;
  title: string;
  file_url: string;
  file_type: string | null;
  sort_order: number;
  created_at: string;
};

export type SponsorCoupon = {
  id: string;
  sponsor_id: string;
  code: string;
  description: string | null;
  discount_value: number;
  discount_type: "percentage" | "fixed";
  valid_until: string | null;
  max_uses: number | null;
  current_uses: number;
  created_at: string;
};

export type SponsorWithDetails = Sponsor & {
  documents: SponsorDocument[];
  coupons: SponsorCoupon[];
};

export type SponsorLead = {
  id: string;
  sponsor_id: string;
  event_id: string;
  user_id: string;
  name: string;
  email: string;
  company: string | null;
  job_title: string | null;
  notes: string | null;
  created_at: string;
};

export type SponsorsByTierGroup = {
  tier: SponsorTier | null;
  sponsors: Sponsor[];
};

export type SponsorAnalytics = {
  sponsor_id: string;
  name: string;
  visit_count: number;
  lead_count: number;
};

export async function getSponsorsByEvent(eventId: string): Promise<Sponsor[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sponsors")
    .select("*, tier:sponsor_tiers(*)")
    .eq("event_id", eventId)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return (data ?? []) as Sponsor[];
}

export async function getSponsorById(sponsorId: string): Promise<SponsorWithDetails> {
  const supabase = await createClient();

  const { data, error } = await supabase
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
  } as unknown as SponsorWithDetails;
}

export async function getSponsorsByTier(eventId: string): Promise<SponsorsByTierGroup[]> {
  const supabase = await createClient();

  const { data: tiers, error: tiersError } = await supabase
    .from("sponsor_tiers")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order");

  if (tiersError) throw new Error(tiersError.message);

  const { data: sponsors, error: sponsorsError } = await supabase
    .from("sponsors")
    .select("*, tier:sponsor_tiers(*)")
    .eq("event_id", eventId)
    .order("sort_order");

  if (sponsorsError) throw new Error(sponsorsError.message);

  const groups: SponsorsByTierGroup[] = [];

  for (const tier of tiers ?? []) {
    groups.push({
      tier: tier as SponsorTier,
      sponsors: ((sponsors ?? []) as Sponsor[]).filter((s) => s.tier_id === tier.id),
    });
  }

  // Add sponsors with no tier
  const untiered = ((sponsors ?? []) as Sponsor[]).filter((s) => s.tier_id === null);
  if (untiered.length > 0) {
    groups.push({ tier: null, sponsors: untiered });
  }

  return groups;
}

export async function getSponsorLeads(sponsorId: string): Promise<SponsorLead[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sponsor_leads")
    .select("*")
    .eq("sponsor_id", sponsorId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as SponsorLead[];
}

export async function getSponsorAnalytics(eventId: string): Promise<SponsorAnalytics[]> {
  const supabase = await createClient();

  const { data: sponsors, error: sponsorsError } = await supabase
    .from("sponsors")
    .select("id, name")
    .eq("event_id", eventId)
    .order("sort_order");

  if (sponsorsError) throw new Error(sponsorsError.message);

  const results: SponsorAnalytics[] = [];

  for (const sponsor of sponsors ?? []) {
    const { count: visitCount } = await supabase
      .from("booth_visits")
      .select("*", { count: "exact", head: true })
      .eq("sponsor_id", sponsor.id);

    const { count: leadCount } = await supabase
      .from("sponsor_leads")
      .select("*", { count: "exact", head: true })
      .eq("sponsor_id", sponsor.id);

    results.push({
      sponsor_id: sponsor.id,
      name: sponsor.name,
      visit_count: visitCount ?? 0,
      lead_count: leadCount ?? 0,
    });
  }

  return results;
}
