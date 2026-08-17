"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function addComment(photoId: string, content: string) {
  if (content.length > 140) {
    throw new Error("Comment must be 140 characters or less");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("photo_comments")
    .insert({
      photo_id: photoId,
      user_id: user.id,
      content,
    })
    .select()
    .single();
  if (error) throw error;

  revalidatePath("/", "layout");
  return data;
}

export async function deleteComment(commentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("photo_comments")
    .delete()
    .eq("id", commentId);
  if (error) throw error;

  revalidatePath("/", "layout");
}
