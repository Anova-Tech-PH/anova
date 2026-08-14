import { createClient } from "@attendly/ui/supabase/server";

export type RegistrationSettings = {
  registration_open?: string;
  registration_close?: string;
  capacity_limit?: number;
  waitlist_enabled?: boolean;
  terms_and_conditions?: string;
  registration_closed_message?: string;
};

export async function getRegistrationSettings(eventId: string): Promise<RegistrationSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("registration_settings")
    .eq("id", eventId)
    .single();
  if (error) throw new Error(error.message);
  return (data?.registration_settings ?? {}) as RegistrationSettings;
}

export type WaitlistEntry = {
  id: string;
  event_id: string;
  ticket_type_id: string | null;
  email: string;
  name: string;
  created_at: string;
};

export async function getWaitlistEntries(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("waitlist_entries")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return data as WaitlistEntry[];
}
