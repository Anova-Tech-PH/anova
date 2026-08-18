import type { SupabaseClient } from "@supabase/supabase-js";

export async function getFeedbackForms(client: SupabaseClient, eventId: string) {
  const { data, error } = await client
    .from("feedback_forms")
    .select("*")
    .eq("event_id", eventId)
    .order("is_default", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((f: any) => ({
    ...f,
    questions: (f.questions ?? []),
  }));
}

export async function getDefaultFeedbackForm(client: SupabaseClient, eventId: string) {
  const { data, error } = await client
    .from("feedback_forms")
    .select("*")
    .eq("event_id", eventId)
    .eq("is_default", true)
    .single();

  if (error || !data) return null;
  return { ...data, questions: (data as any).questions ?? [] };
}
