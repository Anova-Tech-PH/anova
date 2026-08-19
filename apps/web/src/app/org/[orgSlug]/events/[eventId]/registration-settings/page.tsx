import { getRegistrationSettings, getWaitlistEntries } from "@/features/registration-settings/queries";
import { RegistrationSettingsForm } from "@/features/registration-settings/components/registration-settings-form";
import { Settings } from "lucide-react";

export default async function RegistrationSettingsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [settings, waitlistEntries] = await Promise.all([
    getRegistrationSettings(eventId),
    getWaitlistEntries(eventId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[oklch(0.445_0.107_195_/_0.1)]">
          <Settings className="h-5 w-5 text-[oklch(0.445_0.107_195)]" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Registration Settings</h2>
          <p className="text-sm text-muted-foreground">
            Configure registration windows, capacity limits, waitlists, and terms.
          </p>
        </div>
      </div>

      <RegistrationSettingsForm
        eventId={eventId}
        initialSettings={settings}
        waitlistEntries={waitlistEntries}
      />
    </div>
  );
}
