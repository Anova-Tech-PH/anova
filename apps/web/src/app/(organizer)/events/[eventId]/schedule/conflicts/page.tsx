import { getSessionsByEvent } from "@/features/schedule/queries";
import {
  detectConflicts,
  type SessionForConflict,
} from "@/features/schedule/conflict-check";
import { ConflictCheckResults } from "@/features/schedule/components/conflict-check-results";

export default async function ConflictCheckPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const sessions = await getSessionsByEvent(eventId);

  const sessionsForCheck: SessionForConflict[] = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    start_time: s.start_time,
    end_time: s.end_time,
    location: s.location,
    track_id: s.track?.id ?? null,
    speaker_ids: s.session_speakers.map((ss: any) => ss.speaker_id),
  }));

  const conflicts = detectConflicts(sessionsForCheck);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Conflict Check</h1>
        <p className="text-sm text-muted-foreground">
          Scan your agenda for scheduling conflicts across rooms, speakers, and
          tracks.
        </p>
      </div>
      <ConflictCheckResults conflicts={conflicts} />
    </div>
  );
}
