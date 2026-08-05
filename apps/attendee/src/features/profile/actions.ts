"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";
import { updateProfileMutation } from "@attendly/supabase-client/mutations/profile";

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

  await updateProfileMutation(supabase, user.id, data);
  revalidatePath("/profile");
}
