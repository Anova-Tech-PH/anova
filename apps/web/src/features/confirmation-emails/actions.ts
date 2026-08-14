"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function createTemplate(eventId: string, data: {
  ticket_type_id?: string | null;
  subject: string;
  body: string;
}) {
  if (!data.subject?.trim()) throw new Error("Subject is required");
  if (!data.body?.trim()) throw new Error("Body is required");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: template, error } = await supabase
    .from("confirmation_email_templates")
    .insert({
      event_id: eventId,
      ticket_type_id: data.ticket_type_id || null,
      subject: data.subject.trim(),
      body: data.body.trim(),
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("A template for this ticket type already exists");
    throw new Error(error.message);
  }
  revalidatePath(`/events/${eventId}/confirmation-emails`);
  return template;
}

export async function updateTemplate(eventId: string, templateId: string, data: {
  subject?: string;
  body?: string;
  enabled?: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("confirmation_email_templates")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", templateId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/confirmation-emails`);
}

export async function deleteTemplate(eventId: string, templateId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("confirmation_email_templates")
    .delete()
    .eq("id", templateId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/confirmation-emails`);
}
