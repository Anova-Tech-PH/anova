import { SupabaseClient } from "@supabase/supabase-js";

export async function getProfile(client: SupabaseClient, userId: string) {
  const { data } = await client
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  return data;
}
