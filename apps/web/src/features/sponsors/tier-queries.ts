import { createClient } from "@attendly/ui/supabase/server";

export type SponsorTier = {
  id: string;
  event_id: string;
  name: string;
  sort_order: number;
  logo_size: "large" | "medium" | "small";
  benefits: unknown[];
  created_at: string;
  updated_at: string;
};

export async function getTiersByEvent(eventId: string): Promise<SponsorTier[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sponsor_tiers")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return (data ?? []) as SponsorTier[];
}
