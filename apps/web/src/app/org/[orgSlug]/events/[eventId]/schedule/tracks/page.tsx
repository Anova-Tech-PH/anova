import { getTracksByEvent } from "@/features/schedule/queries";
import { TrackManager } from "@/features/schedule/components/track-manager";

export default async function TrackManagerPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const tracks = await getTracksByEvent(eventId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Track Manager</h1>
        <p className="text-sm text-muted-foreground">
          Organize sessions into parallel tracks with color coding.
        </p>
      </div>
      <TrackManager
        eventId={eventId}
        initialTracks={tracks}
      />
    </div>
  );
}
