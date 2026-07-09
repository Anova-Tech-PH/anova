import { getScheduleData } from "@/features/schedule/queries";
import { getSpeakersByEvent } from "@/features/speakers/queries";
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Schedule</h1>
        <p className="text-sm text-muted-foreground">
          Manage sessions, speakers, and tracks for this event.
        </p>
      </div>

      <ScheduleEditor
        eventId={eventId}
        initialTracks={scheduleData.tracks}
        initialSessions={scheduleData.sessions}
        initialSpeakers={speakers}
      />
    </div>
  );
}
