import { Users } from "lucide-react";
import { ComingSoon } from "@/features/speakers/components/coming-soon";

export default function AttendeeLimitPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Attendee Limit Upgrade</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your event's attendee capacity and upgrade limits.
        </p>
      </div>

      <ComingSoon
        title="Attendee Limit Upgrade"
        description="Set and upgrade your event's attendee capacity. Monitor registration counts against limits and upgrade when you need more capacity."
        icon={<Users className="h-7 w-7" />}
      />
    </div>
  );
}
