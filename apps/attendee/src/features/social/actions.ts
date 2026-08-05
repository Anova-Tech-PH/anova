"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";
import {
  createPostMutation,
  togglePostLikeMutation,
  createCommentMutation,
  deletePostMutation,
  votePollMutation,
} from "@attendly/supabase-client/mutations/social";

export async function uploadPostImage(formData: FormData): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) throw new Error("File must be under 5MB");

  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(file.type)) throw new Error("Only JPEG, PNG, GIF, and WebP are allowed");

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${user.id}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("post-images")
    .upload(path, file);

  if (error) throw new Error(error.message);

  const { data: urlData } = supabase.storage
    .from("post-images")
    .getPublicUrl(path);

  return urlData.publicUrl;
}

export async function createPost(data: {
  event_id: string;
  type: string;
  content: string;
  image_url?: string;
  poll_options?: string[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const result = await createPostMutation(supabase, user.id, data);
  revalidatePath("/feed");
  return result;
}

export async function togglePostLike(postId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  return togglePostLikeMutation(supabase, postId, user.id);
}

export async function createComment(postId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  return createCommentMutation(supabase, postId, user.id, content);
}

export async function deletePost(postId: string) {
  const supabase = await createClient();
  await deletePostMutation(supabase, postId);
  revalidatePath("/feed");
}

export async function votePoll(postId: string, optionIndex: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await votePollMutation(supabase, postId, user.id, optionIndex);
  revalidatePath("/feed");
}
