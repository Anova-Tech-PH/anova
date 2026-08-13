import { Mail } from "lucide-react";
import { ComingSoon } from "@/features/speakers/components/coming-soon";

export default function MessageSponsorsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Message Sponsors</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Send personalized emails to your sponsors with setup instructions and updates.
        </p>
      </div>

      <ComingSoon
        title="Message Sponsors"
        description="Send email campaigns to your sponsors using customizable templates. Remind sponsors to set up their profiles, upload materials, and prepare for the event."
        icon={<Mail className="h-7 w-7" />}
      />
    </div>
  );
}
