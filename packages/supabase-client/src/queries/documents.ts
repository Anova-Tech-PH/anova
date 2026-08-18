import type { SupabaseClient } from "@supabase/supabase-js";

export async function getEventDocuments(client: SupabaseClient, eventId: string) {
  const { data, error } = await client
    .from("event_documents")
    .select("*")
    .eq("event_id", eventId)
    .is("session_id", null)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAllDocumentsByEvent(client: SupabaseClient, eventId: string) {
  const { data, error } = await client
    .from("event_documents")
    .select("*, session:sessions(id, title)")
    .eq("event_id", eventId)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return data ?? [];
}
