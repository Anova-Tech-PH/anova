import { createClient } from "@attendly/ui/supabase/server";

export type AttendeeCategory = {
  id: string;
  event_id: string;
  name: string;
  color: string;
  is_visible_in_directory: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type VisibilityPair = {
  viewer_category_id: string;
  visible_category_id: string;
};

export type TicketCategoryMapping = {
  ticket_type_id: string;
  category_id: string;
};

export async function getCategories(eventId: string): Promise<AttendeeCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendee_categories")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data as AttendeeCategory[];
}

export async function getVisibilityMatrix(categoryIds: string[]): Promise<VisibilityPair[]> {
  if (categoryIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("category_visibility")
    .select("viewer_category_id, visible_category_id")
    .in("viewer_category_id", categoryIds);
  if (error) throw new Error(error.message);
  return data as VisibilityPair[];
}

export async function getTicketCategoryMappings(ticketTypeIds: string[]): Promise<TicketCategoryMapping[]> {
  if (ticketTypeIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ticket_type_categories")
    .select("ticket_type_id, category_id")
    .in("ticket_type_id", ticketTypeIds);
  if (error) throw new Error(error.message);
  return data as TicketCategoryMapping[];
}
