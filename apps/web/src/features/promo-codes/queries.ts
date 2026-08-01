import { createClient } from "@attendly/ui/supabase/server";

export type PromoCode = {
  id: string;
  event_id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  applies_to: string[];
  starts_at: string | null;
  expires_at: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export async function getPromoCodesByEvent(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as PromoCode[];
}
