import { Settings } from "lucide-react";
import { ComingSoon } from "@/features/speakers/components/coming-soon";

export default function SpeakerSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Speaker Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure the speaker form, notification preferences, and collection fields.
        </p>
      </div>

      <ComingSoon
        title="Speaker Form Settings"
        description="Customize which fields to collect from speakers, set up speaker form emails, and configure notification preferences for profile updates."
        icon={<Settings className="h-7 w-7" />}
      />
    </div>
  );
}
