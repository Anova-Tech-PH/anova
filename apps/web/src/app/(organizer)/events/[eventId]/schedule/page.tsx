import { getScheduleData } from "@/features/schedule/queries";
import { getSpeakersByEvent } from "@/features/speakers/queries";
import { getAllDocumentsByEvent } from "@/features/documents/queries";
import { getPolls } from "@/features/polls/queries";
import { ScheduleEditor } from "./schedule-editor";

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const [scheduleData, speakers] = await Promise.all([
    getScheduleData(eventId),
    getSpeakersByEvent(eventId),
  ]);

  // These tables may not exist in all environments — gracefully fall back
  let allDocs: Awaited<ReturnType<typeof getAllDocumentsByEvent>> = [];
  let allPolls: Awaited<ReturnType<typeof getPolls>> = [];
  try { allDocs = await getAllDocumentsByEvent(eventId); } catch { /* table missing */ }
  try { allPolls = await getPolls(eventId); } catch { /* table missing */ }

  // Extract unique room names from existing sessions
  const rooms = [
    ...new Set(
      scheduleData.sessions
        .map((s: { location?: string | null }) => s.location)
        .filter((loc: string | null | undefined): loc is string => !!loc)
    ),
  ].sort();

  // Build document/poll ID lookups per session
  const docsBySession = new Map<string, string[]>();
  for (const doc of allDocs) {
    if (doc.session_id) {
      const ids = docsBySession.get(doc.session_id) ?? [];
      ids.push(doc.id);
      docsBySession.set(doc.session_id, ids);
    }
  }

  const pollsBySession = new Map<string, string[]>();
  for (const poll of allPolls) {
    if (poll.session_id) {
      const ids = pollsBySession.get(poll.session_id) ?? [];
      ids.push(poll.id);
      pollsBySession.set(poll.session_id, ids);
    }
  }

  // Enrich sessions with document_ids and poll_ids
  const enrichedSessions = scheduleData.sessions.map((s: { id: string }) => ({
    ...s,
    document_ids: docsBySession.get(s.id) ?? [],
    poll_ids: pollsBySession.get(s.id) ?? [],
  }));

  // Format documents and polls for the session form
  const eventDocuments = allDocs.map((d) => ({ id: d.id, title: d.title }));
  const eventPolls = allPolls.map((p) => ({ id: p.id, question: p.question }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Session Manager</h1>
        <p className="text-sm text-muted-foreground">
          Create and manage sessions for your event agenda.
        </p>
      </div>

      <ScheduleEditor
        eventId={eventId}
        initialTracks={scheduleData.tracks}
        initialSessions={enrichedSessions}
        initialSpeakers={speakers}
        initialRooms={rooms}
        initialDocuments={eventDocuments}
        initialPolls={eventPolls}
      />
    </div>
  );
}
