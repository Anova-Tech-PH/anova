import { getSpeakersByEvent } from "@/features/speakers/queries";
import { SpeakerManager } from "@/features/speakers/components/speaker-manager";

export default async function SpeakerManagerPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const speakers = await getSpeakersByEvent(eventId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Speaker Manager</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add and manage speakers for your event. Send speaker forms to collect bios, photos, and session details.
        </p>
      </div>

      <SpeakerManager eventId={eventId} initialSpeakers={speakers} />
    </div>
  );
}
