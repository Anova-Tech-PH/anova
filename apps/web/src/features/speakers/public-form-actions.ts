"use server";

import { createClient } from "@attendly/ui/supabase/server";

export async function submitSpeakerForm(
  token: string,
  data: Record<string, string | null>
) {
  const supabase = await createClient();

  const { data: tokenData, error: tokenError } = await supabase
    .from("speaker_form_tokens")
    .select("speaker_id, event_id, expires_at")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (tokenError || !tokenData) {
    throw new Error("Invalid or expired form link");
  }

  const allowedKeys = new Set([
    "name", "title", "company", "bio", "photo", "email",
    "linkedin_url", "twitter_handle", "website_url",
  ]);

  const updateData: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(data)) {
    if (allowedKeys.has(key)) {
      updateData[key] = value || null;
    }
  }

  updateData.updated_at = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("speakers")
    .update(updateData)
    .eq("id", tokenData.speaker_id);

  if (updateError) throw new Error(updateError.message);
}
