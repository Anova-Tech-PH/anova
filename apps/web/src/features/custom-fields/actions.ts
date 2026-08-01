"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function createCustomField(eventId: string, data: {
  label: string;
  field_key: string;
  type: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
}) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("custom_registration_fields")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const sortOrder = existing?.[0] ? existing[0].sort_order + 1 : 0;

  const { data: field, error } = await supabase
    .from("custom_registration_fields")
    .insert({
      event_id: eventId,
      label: data.label,
      field_key: data.field_key,
      type: data.type,
      required: data.required ?? false,
      options: data.options ?? [],
      placeholder: data.placeholder ?? null,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}`);
  return field;
}

export async function updateCustomField(eventId: string, fieldId: string, data: {
  label?: string;
  type?: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("custom_registration_fields")
    .update(data)
    .eq("id", fieldId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}`);
}

export async function deleteCustomField(eventId: string, fieldId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("custom_registration_fields")
    .delete()
    .eq("id", fieldId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}`);
}
