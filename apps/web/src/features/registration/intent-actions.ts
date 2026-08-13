"use server";

import { createClient } from "@attendly/ui/supabase/server";

export async function trackRegistrationIntent(data: {
  event_id: string;
  ticket_type_id: string;
  email: string;
  name?: string;
  custom_fields?: Record<string, unknown>;
  promo_code_id?: string;
}) {
  const supabase = await createClient();

  const { data: intent, error } = await supabase
    .from("registration_intents")
    .upsert(
      {
        event_id: data.event_id,
        ticket_type_id: data.ticket_type_id,
        email: data.email.toLowerCase().trim(),
        name: data.name ?? null,
        custom_fields: data.custom_fields ?? {},
        promo_code_id: data.promo_code_id ?? null,
        status: "pending",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "event_id,email",
        ignoreDuplicates: false,
      }
    )
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return intent;
}
