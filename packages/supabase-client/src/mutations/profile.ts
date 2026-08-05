import { SupabaseClient } from "@supabase/supabase-js";

export async function updateProfileMutation(
  client: SupabaseClient,
  userId: string,
  data: {
    full_name: string;
    avatar_url?: string;
    bio?: string;
    company?: string;
    job_title?: string;
    interests?: string[];
    looking_for?: string[];
    linkedin_url?: string;
    twitter_handle?: string;
  },
) {
  const { error } = await client
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
    .eq("id", userId);

  if (error) throw new Error(error.message);
}
