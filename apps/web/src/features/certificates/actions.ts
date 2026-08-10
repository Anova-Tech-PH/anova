"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveCertificateConfig(
  eventId: string,
  data: {
    title: string;
    min_check_ins: number;
    required_session_ids: string[];
    custom_fields: Record<string, string>;
    template_style: string;
    enabled: boolean;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("certificate_configs")
    .upsert(
      {
        event_id: eventId,
        title: data.title,
        min_check_ins: data.min_check_ins,
        required_session_ids: data.required_session_ids,
        custom_fields: data.custom_fields,
        template_style: data.template_style,
        enabled: data.enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id" }
    );

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/certificates`);
}

export async function issueCertificates(eventId: string, registrationIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: config } = await supabase
    .from("certificate_configs")
    .select("id")
    .eq("event_id", eventId)
    .single();

  if (!config) throw new Error("Certificate config not found");

  const rows = registrationIds.map((rid) => ({
    config_id: config.id,
    registration_id: rid,
  }));

  const { error } = await supabase
    .from("certificates_issued")
    .upsert(rows, { onConflict: "config_id,registration_id" });

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/certificates`);
}
