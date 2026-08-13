"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function createDocument(
  eventId: string,
  data: {
    title: string;
    type: "file" | "video";
    session_id?: string | null;
    file_url?: string | null;
    external_url?: string | null;
    file_size?: number | null;
    file_type?: string | null;
    sort_order?: number;
  }
) {
  const supabase = await createClient();

  const { data: doc, error } = await supabase
    .from("event_documents")
    .insert({
      event_id: eventId,
      title: data.title,
      type: data.type,
      session_id: data.session_id ?? null,
      file_url: data.file_url ?? null,
      external_url: data.external_url ?? null,
      file_size: data.file_size ?? null,
      file_type: data.file_type ?? null,
      sort_order: data.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/documents`);
  return doc;
}

export async function updateDocument(
  eventId: string,
  docId: string,
  data: {
    title?: string;
    type?: "file" | "video";
    session_id?: string | null;
    file_url?: string | null;
    external_url?: string | null;
    file_size?: number | null;
    file_type?: string | null;
    sort_order?: number;
  }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("event_documents")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", docId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/documents`);
}

export async function deleteDocument(eventId: string, docId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("event_documents")
    .delete()
    .eq("id", docId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/documents`);
}

export async function trackDownload(docId: string, userId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("document_downloads")
    .insert({ document_id: docId, user_id: userId });

  if (error) throw new Error(error.message);
}
