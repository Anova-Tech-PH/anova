import { Shield } from "lucide-react";
import { ComingSoon } from "@/features/speakers/components/coming-soon";

export default function AttendeeVideoAccessPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Attendee Video Access</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Control which attendees can access video recordings from your event.
        </p>
      </div>

      <ComingSoon
        title="Attendee Video Access"
        description="Set up tiered video access for your attendees. Control which ticket types or registration tiers can view video recordings from your event."
        icon={<Shield className="h-7 w-7" />}
      />
    </div>
  );
}
