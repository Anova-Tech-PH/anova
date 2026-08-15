"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { randomBytes } from "crypto";

/**
 * Generate an 8-character uppercase hex referral code.
 */
function generateCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

/**
 * Get or create a referral code for a user at an event.
 */
export async function getOrCreateReferralCode(
  eventId: string,
  userId: string
): Promise<{ code: string; registrations_count: number }> {
  const supabase = await createClient();

  // Try to find existing code
  const { data: existing, error } = await supabase
    .from("referral_codes")
    .select("code, registrations_count")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .single();

  if (existing && !error) {
    return { code: existing.code, registrations_count: existing.registrations_count };
  }

  // Create new code
  const code = generateCode();
  const { data: created } = await supabase
    .from("referral_codes")
    .insert({
      event_id: eventId,
      user_id: userId,
      code,
      registrations_count: 0,
    })
    .select("code, registrations_count")
    .single();

  return { code: created?.code ?? code, registrations_count: created?.registrations_count ?? 0 };
}

/**
 * Process a referral: look up the code, prevent self-referral,
 * record the registration, increment the counter, award points.
 */
export async function processReferral(
  referralCode: string,
  registeredUserId: string
): Promise<{ success: boolean; points: number }> {
  const supabase = await createClient();

  // Look up referral code
  const { data: codeRow, error } = await supabase
    .from("referral_codes")
    .select("id, event_id, user_id, code")
    .eq("code", referralCode)
    .single();

  if (!codeRow || error) {
    return { success: false, points: 0 };
  }

  // Prevent self-referral
  if (codeRow.user_id === registeredUserId) {
    return { success: false, points: 0 };
  }

  // Insert referral registration
  const { error: insertError } = await supabase.from("referral_registrations").insert({
    referral_code_id: codeRow.id,
    registered_user_id: registeredUserId,
    event_id: codeRow.event_id,
  });

  if (insertError) {
    return { success: false, points: 0 };
  }

  // Increment counter on referral_codes
  await supabase
    .from("referral_codes")
    .update({ registrations_count: undefined }) // will be handled by RPC or raw increment
    .eq("id", codeRow.id);

  // Award points to referrer
  const { data: pointsAwarded } = await supabase.rpc("award_points", {
    _event_id: codeRow.event_id,
    _user_id: codeRow.user_id,
    _activity_type: "referral_registration",
    _reference_id: codeRow.id,
    _reference_type: "referral",
  });

  return { success: true, points: (pointsAwarded as number) ?? 0 };
}

/**
 * Get referral statistics for an event, ordered by registration count.
 */
export async function getReferralStats(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("referral_codes")
    .select("code, registrations_count, profiles:user_id(full_name)")
    .eq("event_id", eventId)
    .order("registrations_count", { ascending: false });

  return data ?? [];
}
