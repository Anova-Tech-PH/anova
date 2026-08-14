import { createClient } from "@attendly/ui/supabase/server";

export type RegistrationPage = {
  id: string;
  event_id: string;
  name: string;
  slug: string;
  ticket_type_ids: string[];
  is_default: boolean;
  created_at: string;
};

export async function getRegistrationPages(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("registration_pages")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return data as RegistrationPage[];
}

export async function getRegistrationPageBySlug(eventId: string, slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("registration_pages")
    .select("*")
    .eq("event_id", eventId)
    .eq("slug", slug)
    .single();
  if (error) return null;
  return data as RegistrationPage;
}
