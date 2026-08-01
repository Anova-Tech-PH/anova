"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";
import type { TemplateData } from "./queries";

export async function saveAsTemplate(
  eventId: string,
  name: string,
  description?: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Fetch the event
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();
  if (eventError || !event) throw new Error("Event not found");

  // Verify org membership
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", event.organization_id)
    .eq("user_id", user.id)
    .single();
  if (!membership) throw new Error("Not a member of this organization");

  // Fetch related data
  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("name, description, type, price, quantity, sort_order")
    .eq("event_id", eventId);

  const { data: tracks } = await supabase
    .from("tracks")
    .select("name, color, sort_order")
    .eq("event_id", eventId);

  const { data: customFields } = await supabase
    .from("custom_registration_fields")
    .select("label, field_key, type, required, options, placeholder, sort_order")
    .eq("event_id", eventId);

  const templateData: TemplateData = {
    title: event.title,
    description: event.description,
    timezone: event.timezone,
    venue_name: event.venue_name,
    venue_address: event.venue_address,
    is_virtual: event.is_virtual,
    virtual_url: event.virtual_url,
    cover_image: event.cover_image,
    require_approval: event.require_approval,
    theme: event.theme ?? null,
    settings: event.settings ?? null,
    ticket_types: ticketTypes ?? [],
    tracks: tracks ?? [],
    custom_fields: customFields ?? [],
  };

  const { data: template, error: insertError } = await supabase
    .from("event_templates")
    .insert({
      organization_id: event.organization_id,
      name,
      description: description || null,
      template_data: templateData,
    })
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message);

  revalidatePath("/events/new");

  return { id: template.id };
}

export async function deleteTemplate(templateId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("event_templates")
    .delete()
    .eq("id", templateId);

  if (error) throw new Error(error.message);

  revalidatePath("/events/new");
}

export async function createEventFromTemplate(
  templateId: string,
  overrides: {
    title: string;
    slug: string;
    start_date: string;
    end_date: string;
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Fetch template
  const { data: template, error: templateError } = await supabase
    .from("event_templates")
    .select("*")
    .eq("id", templateId)
    .single();
  if (templateError || !template) throw new Error("Template not found");

  // Verify org membership
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", template.organization_id)
    .eq("user_id", user.id)
    .single();
  if (!membership) throw new Error("Not a member of this organization");

  const td = template.template_data as TemplateData;

  // Create the event
  const { data: newEvent, error: eventError } = await supabase
    .from("events")
    .insert({
      organization_id: template.organization_id,
      title: overrides.title,
      slug: overrides.slug,
      description: td.description,
      start_date: overrides.start_date,
      end_date: overrides.end_date,
      timezone: td.timezone,
      venue_name: td.venue_name,
      venue_address: td.venue_address,
      is_virtual: td.is_virtual,
      virtual_url: td.virtual_url,
      cover_image: td.cover_image,
      require_approval: td.require_approval,
      theme: td.theme,
      settings: td.settings,
      status: "draft",
    })
    .select("id")
    .single();

  if (eventError || !newEvent)
    throw new Error(eventError?.message ?? "Failed to create event");

  const newEventId = newEvent.id;

  // Create ticket types
  if (td.ticket_types && td.ticket_types.length > 0) {
    await supabase
      .from("ticket_types")
      .insert(td.ticket_types.map((t) => ({ ...t, event_id: newEventId })));
  }

  // Create tracks
  if (td.tracks && td.tracks.length > 0) {
    for (const track of td.tracks) {
      await supabase.from("tracks").insert({
        event_id: newEventId,
        name: track.name,
        color: track.color,
        sort_order: track.sort_order,
      });
    }
  }

  // Create custom registration fields
  if (td.custom_fields && td.custom_fields.length > 0) {
    await supabase
      .from("custom_registration_fields")
      .insert(
        td.custom_fields.map((f) => ({ ...f, event_id: newEventId }))
      );
  }

  revalidatePath("/events");

  return { id: newEventId };
}
