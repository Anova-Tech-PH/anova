import { getAllDocumentsByEvent } from "@/features/documents/queries";
import { DocumentList } from "@/features/documents/components/document-list";
import { createClient } from "@attendly/ui/supabase/server";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const documents = await getAllDocumentsByEvent(eventId);

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, title")
    .eq("event_id", eventId)
    .order("start_time");

  return (
    <DocumentList
      documents={documents}
      eventId={eventId}
      sessions={sessions ?? []}
    />
  );
}
