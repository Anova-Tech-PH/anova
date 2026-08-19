import { RecoverySettings } from "@/features/registration/components/recovery-settings";
import {
  getRecoverySettings,
  getRecoveryStats,
} from "@/features/registration/recovery-queries";
import { WidgetConfigurator } from "@/features/widgets/components/widget-configurator";

export default async function MarketingPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const [recoverySettings, recoveryStats] = await Promise.all([
    getRecoverySettings(eventId),
    getRecoveryStats(eventId),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Marketing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Recover abandoned registrations and embed your event content on
          external websites.
        </p>
      </div>

      <RecoverySettings
        eventId={eventId}
        initialSettings={recoverySettings}
        stats={recoveryStats}
      />

      <WidgetConfigurator
        eventId={eventId}
        widgetType="agenda"
        title="Agenda Widget"
        description="Display your event schedule on any website. Sessions auto-sync with your dashboard."
        toggles={[
          { key: "showDesc", label: "Show session descriptions", defaultOn: true },
          { key: "showSpeakers", label: "Show speaker names & photos", defaultOn: true },
          { key: "showTrack", label: "Show track names & colors", defaultOn: true },
          { key: "showTime", label: "Show session times", defaultOn: true },
          { key: "showLocation", label: "Show room/location", defaultOn: true },
        ]}
      />

      <WidgetConfigurator
        eventId={eventId}
        widgetType="speakers"
        title="Speakers Widget"
        description="Showcase your speakers on any website with photos, bios, and affiliations."
        toggles={[
          { key: "showPhoto", label: "Show speaker photos", defaultOn: true },
          { key: "showCompany", label: "Show title & company", defaultOn: true },
          { key: "showBio", label: "Show speaker bio", defaultOn: true },
        ]}
        extraControls={[
          {
            key: "layout",
            label: "Layout",
            options: [
              { value: "grid", label: "Grid" },
              { value: "list", label: "List" },
            ],
          },
        ]}
      />

      <WidgetConfigurator
        eventId={eventId}
        widgetType="register"
        title="Registration Widget"
        description="Let visitors register for your event directly from your website."
        toggles={[
          { key: "showEventInfo", label: "Show event info header", defaultOn: true },
        ]}
      />
    </div>
  );
}
