import { LogOut } from "lucide-react";
import { ComingSoon } from "@/features/speakers/components/coming-soon";

export default function AttendeeCheckoutPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Attendee Checkout</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Track when attendees leave the event.
        </p>
      </div>

      <ComingSoon
        title="Attendee Checkout"
        description="Allow attendees to check out when they leave the event. Track attendance duration, generate exit reports, and collect departure feedback."
        icon={<LogOut className="h-7 w-7" />}
      />
    </div>
  );
}
