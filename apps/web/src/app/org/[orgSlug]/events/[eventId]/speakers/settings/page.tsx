import { getSpeakerFormSettings, getSpeakerFormFields } from "@/features/speakers/settings-queries";
import { SpeakerSettings } from "@/features/speakers/components/speaker-settings";

export default async function SpeakerSettingsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [settings, fields] = await Promise.all([
    getSpeakerFormSettings(eventId),
    getSpeakerFormFields(eventId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Speaker Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure the speaker form, notification preferences, and collection fields.
        </p>
      </div>

      <SpeakerSettings
        eventId={eventId}
        initialSettings={settings}
        initialFields={fields ?? []}
      />
    </div>
  );
}
