"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { randomUUID } from "crypto";

export async function uploadContestPhoto(formData: FormData): Promise<string> {
  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  const ext = file.name.split(".").pop() ?? "jpg";
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.");
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error("File too large. Maximum size is 10MB.");
  }

  const supabase = await createClient();
  const path = `${randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("contest-photos")
    .upload(path, file, { contentType: file.type });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage
    .from("contest-photos")
    .getPublicUrl(path);

  return data.publicUrl;
}
