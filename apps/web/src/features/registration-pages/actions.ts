"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function createRegistrationPage(
  eventId: string,
  data: {
    name: string;
    slug?: string;
    ticket_type_ids: string[];
  }
) {
  if (!data.name?.trim()) throw new Error("Name is required");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const slug = data.slug?.trim() || generateSlug(data.name);

  const { data: page, error } = await supabase
    .from("registration_pages")
    .insert({
      event_id: eventId,
      name: data.name.trim(),
      slug,
      ticket_type_ids: data.ticket_type_ids,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("A registration page with this slug already exists");
    }
    throw new Error(error.message);
  }

  revalidatePath(`/events/${eventId}/registration-pages`);
  return page;
}

export async function updateRegistrationPage(
  eventId: string,
  pageId: string,
  data: {
    name?: string;
    slug?: string;
    ticket_type_ids?: string[];
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.slug !== undefined) updateData.slug = data.slug.trim();
  if (data.ticket_type_ids !== undefined)
    updateData.ticket_type_ids = data.ticket_type_ids;

  const { error } = await supabase
    .from("registration_pages")
    .update(updateData)
    .eq("id", pageId)
    .eq("event_id", eventId);

  if (error) {
    if (error.code === "23505") {
      throw new Error("A registration page with this slug already exists");
    }
    throw new Error(error.message);
  }

  revalidatePath(`/events/${eventId}/registration-pages`);
}

export async function deleteRegistrationPage(
  eventId: string,
  pageId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("registration_pages")
    .delete()
    .eq("id", pageId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/registration-pages`);
}
