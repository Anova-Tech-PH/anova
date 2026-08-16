"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";
import type { LogisticsItem } from "./queries";

export async function createLogisticsItem(
  eventId: string,
  template: string,
  title: string,
  content: string
): Promise<LogisticsItem> {
  const supabase = await createClient();

  // Get next sort_order
  const { data: existing } = await supabase
    .from("logistics_items")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("logistics_items")
    .insert({
      event_id: eventId,
      template,
      title,
      content,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
  return data;
}

export async function updateLogisticsItem(
  itemId: string,
  updates: { title?: string; content?: string }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("logistics_items")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", itemId);

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

export async function deleteLogisticsItem(itemId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("logistics_items")
    .delete()
    .eq("id", itemId);

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

export async function reorderLogisticsItems(eventId: string, orderedIds: string[]) {
  const supabase = await createClient();

  const updates = orderedIds.map((id, index) =>
    supabase
      .from("logistics_items")
      .update({ sort_order: index, updated_at: new Date().toISOString() })
      .eq("id", id)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  revalidatePath("/", "layout");
}
