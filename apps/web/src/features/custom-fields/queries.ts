import { createClient } from "@attendly/ui/supabase/server";

export type CustomField = {
  id: string;
  event_id: string;
  label: string;
  field_key: string;
  type: string;
  required: boolean;
  options: string[];
  placeholder: string | null;
  sort_order: number;
};

export async function getCustomFieldsByEvent(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("custom_registration_fields")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order");

  if (error) return [];
  return data as CustomField[];
}
