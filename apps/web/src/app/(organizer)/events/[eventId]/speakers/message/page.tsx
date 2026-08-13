import { Mail } from "lucide-react";
import { ComingSoon } from "@/features/speakers/components/coming-soon";

export default function MessageSpeakersPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Message Speakers</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Send personalized emails to your speakers with logistics, reminders, and updates.
        </p>
      </div>

      <ComingSoon
        title="Message Speakers"
        description="Send email campaigns to your speakers using customizable templates. Keep speakers informed about logistics, registration, and event updates."
        icon={<Mail className="h-7 w-7" />}
      />
    </div>
  );
}
