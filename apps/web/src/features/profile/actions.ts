"use server";

import { createClient } from "@/shared/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(data: {
  full_name: string;
  avatar_url?: string;
  bio?: string;
  company?: string;
  job_title?: string;
  interests?: string[];
  looking_for?: string[];
  linkedin_url?: string;
  twitter_handle?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: data.full_name,
      avatar_url: data.avatar_url || null,
      bio: data.bio || null,
      company: data.company || null,
      job_title: data.job_title || null,
      interests: data.interests ?? [],
      looking_for: data.looking_for ?? [],
      linkedin_url: data.linkedin_url || null,
      twitter_handle: data.twitter_handle || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/profile");
}
