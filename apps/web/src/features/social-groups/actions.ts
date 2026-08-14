"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function createGroup(
  eventId: string,
  data: { title: string; description?: string }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: group, error } = await supabase
    .from("social_groups")
    .insert({
      event_id: eventId,
      created_by: user.id,
      title: data.title,
      description: data.description ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/social-groups`);
  return group;
}

export async function updateGroup(
  eventId: string,
  groupId: string,
  data: { title?: string; description?: string }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("social_groups")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", groupId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/social-groups`);
}

export async function deleteGroup(eventId: string, groupId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("social_groups")
    .delete()
    .eq("id", groupId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/social-groups`);
}
