import { createClient } from "@attendly/ui/supabase/server";

export type EventDocument = {
  id: string;
  event_id: string;
  session_id: string | null;
  title: string;
  type: "file" | "video";
  file_url: string | null;
  external_url: string | null;
  file_size: number | null;
  file_type: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type EventDocumentWithSession = EventDocument & {
  session: { id: string; title: string } | null;
};

export type DocumentWithDownloads = EventDocument & {
  download_count: number;
};

export async function getEventDocuments(eventId: string): Promise<EventDocument[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("event_documents")
    .select("*")
    .eq("event_id", eventId)
    .is("session_id", null)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return (data ?? []) as EventDocument[];
}

export async function getSessionDocuments(sessionId: string): Promise<EventDocument[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("event_documents")
    .select("*")
    .eq("session_id", sessionId)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return (data ?? []) as EventDocument[];
}

export async function getAllDocumentsByEvent(eventId: string): Promise<EventDocumentWithSession[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("event_documents")
    .select("*, session:sessions(id, title)")
    .eq("event_id", eventId)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return (data ?? []) as EventDocumentWithSession[];
}

export async function getDocumentDownloadStats(eventId: string): Promise<DocumentWithDownloads[]> {
  const supabase = await createClient();

  const { data: docs, error } = await supabase
    .from("event_documents")
    .select("*, document_downloads(id)")
    .eq("event_id", eventId)
    .order("sort_order");

  if (error) throw new Error(error.message);

  return (docs ?? []).map((doc) => ({
    ...doc,
    download_count: Array.isArray(doc.document_downloads) ? doc.document_downloads.length : 0,
    document_downloads: undefined,
  })) as DocumentWithDownloads[];
}
