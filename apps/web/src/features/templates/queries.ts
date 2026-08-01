import { createClient } from "@attendly/ui/supabase/server";

export type TemplateData = {
  title: string;
  description: string | null;
  timezone: string;
  venue_name: string | null;
  venue_address: string | null;
  is_virtual: boolean;
  virtual_url: string | null;
  cover_image: string | null;
  require_approval: boolean;
  theme: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
  ticket_types: {
    name: string;
    description: string | null;
    type: string;
    price: number;
    quantity: number;
    sort_order: number;
  }[];
  tracks: {
    name: string;
    color: string | null;
    sort_order: number;
  }[];
  custom_fields: {
    label: string;
    field_key: string;
    type: string;
    required: boolean;
    options: unknown;
    placeholder: string | null;
    sort_order: number;
  }[];
};

export type EventTemplate = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  template_data: TemplateData;
  created_at: string;
  updated_at: string;
};

export async function getTemplatesByOrg(orgId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_templates")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as EventTemplate[];
}

export async function getTemplateById(templateId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (error) throw error;
  return data as EventTemplate;
}
