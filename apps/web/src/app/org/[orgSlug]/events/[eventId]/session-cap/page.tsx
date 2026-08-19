import { Gauge } from "lucide-react";
import { ComingSoon } from "@/features/speakers/components/coming-soon";

export default function SessionCapPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Session Cap</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set attendance limits for individual sessions.
        </p>
      </div>

      <ComingSoon
        title="Session Cap"
        description="Set maximum capacity for sessions and workshops. When a session is full, attendees can join a waitlist. Monitor real-time session enrollment numbers."
        icon={<Gauge className="h-7 w-7" />}
      />
    </div>
  );
}
