"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function createPromoCode(
  eventId: string,
  data: {
    code: string;
    discount_type: "percentage" | "fixed";
    discount_value: number;
    max_uses?: number | null;
    applies_to?: string[];
    starts_at?: string | null;
    expires_at?: string | null;
  }
) {
  const supabase = await createClient();

  const { data: code, error } = await supabase
    .from("promo_codes")
    .insert({
      event_id: eventId,
      code: data.code.toUpperCase().trim(),
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      max_uses: data.max_uses || null,
      applies_to: data.applies_to ?? [],
      starts_at: data.starts_at || null,
      expires_at: data.expires_at || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("A discount code with this name already exists for this event");
    }
    throw new Error(error.message);
  }

  revalidatePath(`/events/${eventId}/promo-codes`);
  return code;
}

export async function updatePromoCode(
  eventId: string,
  codeId: string,
  data: {
    code?: string;
    discount_type?: "percentage" | "fixed";
    discount_value?: number;
    max_uses?: number | null;
    applies_to?: string[];
    starts_at?: string | null;
    expires_at?: string | null;
    active?: boolean;
  }
) {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    ...data,
    updated_at: new Date().toISOString(),
  };
  if (data.code) updateData.code = data.code.toUpperCase().trim();

  const { error } = await supabase
    .from("promo_codes")
    .update(updateData)
    .eq("id", codeId);

  if (error) {
    if (error.code === "23505") {
      throw new Error("A discount code with this name already exists for this event");
    }
    throw new Error(error.message);
  }

  revalidatePath(`/events/${eventId}/promo-codes`);
}

export async function deletePromoCode(eventId: string, codeId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("promo_codes")
    .delete()
    .eq("id", codeId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/promo-codes`);
}

export async function validatePromoCode(
  eventId: string,
  code: string,
  ticketTypeId?: string
): Promise<{ id: string; discount_type: "percentage" | "fixed"; discount_value: number }> {
  const supabase = await createClient();

  const { data: promo, error } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("event_id", eventId)
    .eq("code", code.toUpperCase().trim())
    .single();

  if (error || !promo) {
    throw new Error("Invalid promo code");
  }

  if (!promo.active) {
    throw new Error("This promo code is no longer active");
  }

  const now = new Date();

  if (promo.starts_at && new Date(promo.starts_at) > now) {
    throw new Error("This promo code is not yet active");
  }

  if (promo.expires_at && new Date(promo.expires_at) < now) {
    throw new Error("This promo code has expired");
  }

  if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
    throw new Error("This promo code has reached its usage limit");
  }

  // Check if code applies to the selected ticket type
  if (
    ticketTypeId &&
    promo.applies_to &&
    promo.applies_to.length > 0 &&
    !promo.applies_to.includes(ticketTypeId)
  ) {
    throw new Error("This promo code does not apply to the selected ticket type");
  }

  return {
    id: promo.id,
    discount_type: promo.discount_type as "percentage" | "fixed",
    discount_value: Number(promo.discount_value),
  };
}
