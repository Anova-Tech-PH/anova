"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

const VALID_COLORS = ["blue", "green", "red", "purple", "orange", "pink", "yellow", "gray"];

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");
  return supabase;
}

export async function createCategory(
  eventId: string,
  input: { name: string; color: string; is_visible_in_directory?: boolean }
) {
  if (!input.name.trim()) throw new Error("Name is required");
  if (!VALID_COLORS.includes(input.color)) throw new Error(`Invalid color: ${input.color}`);

  const supabase = await requireAuth();

  // Get next sort_order
  const { data: existing } = await supabase
    .from("attendee_categories")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextSortOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  // Create category
  const { data: created, error } = await supabase
    .from("attendee_categories")
    .insert({
      event_id: eventId,
      name: input.name.trim(),
      color: input.color,
      is_visible_in_directory: input.is_visible_in_directory ?? true,
      sort_order: nextSortOrder,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  // Insert default all-to-all visibility rows
  const { data: allCategories } = await supabase
    .from("attendee_categories")
    .select("id")
    .eq("event_id", eventId)
    .neq("id", created.id);

  const visibilityRows: { viewer_category_id: string; visible_category_id: string }[] = [];

  // Self-visibility
  visibilityRows.push({ viewer_category_id: created.id, visible_category_id: created.id });

  // Bidirectional visibility with all existing categories
  if (allCategories) {
    for (const cat of allCategories) {
      visibilityRows.push({ viewer_category_id: created.id, visible_category_id: cat.id });
      visibilityRows.push({ viewer_category_id: cat.id, visible_category_id: created.id });
    }
  }

  if (visibilityRows.length > 0) {
    await supabase.from("category_visibility").insert(visibilityRows);
  }

  revalidatePath(`/events/${eventId}/attendee-categories`);
  return created;
}

export async function updateCategory(
  eventId: string,
  categoryId: string,
  input: { name?: string; color?: string; is_visible_in_directory?: boolean; sort_order?: number }
) {
  const supabase = await requireAuth();

  const { error } = await supabase
    .from("attendee_categories")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", categoryId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/attendee-categories`);
}

export async function deleteCategory(eventId: string, categoryId: string) {
  const supabase = await requireAuth();

  const { error } = await supabase
    .from("attendee_categories")
    .delete()
    .eq("id", categoryId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/attendee-categories`);
}

export async function setTicketCategoryMapping(
  eventId: string,
  ticketTypeId: string,
  categoryId: string | null
) {
  const supabase = await requireAuth();

  // Delete existing mapping for this ticket type
  await supabase
    .from("ticket_type_categories")
    .delete()
    .eq("ticket_type_id", ticketTypeId);

  // Insert new mapping if categoryId provided
  if (categoryId) {
    const { error } = await supabase
      .from("ticket_type_categories")
      .insert({ ticket_type_id: ticketTypeId, category_id: categoryId });

    if (error) throw new Error(error.message);
  }

  revalidatePath(`/events/${eventId}/attendee-categories`);
  revalidatePath(`/events/${eventId}/tickets`);
}

export async function toggleVisibility(
  eventId: string,
  viewerCategoryId: string,
  visibleCategoryId: string,
  enabled: boolean
) {
  const supabase = await requireAuth();

  if (enabled) {
    const { error } = await supabase
      .from("category_visibility")
      .upsert({ viewer_category_id: viewerCategoryId, visible_category_id: visibleCategoryId });

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("category_visibility")
      .delete()
      .eq("viewer_category_id", viewerCategoryId)
      .eq("visible_category_id", visibleCategoryId);

    if (error) throw new Error(error.message);
  }

  revalidatePath(`/events/${eventId}/attendee-categories`);
}
