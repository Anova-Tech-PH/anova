import { HandHelping } from "lucide-react";
import { ComingSoon } from "@/features/speakers/components/coming-soon";

export default function VolunteerManagerPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Volunteer Manager</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Recruit, manage, and coordinate event volunteers.
        </p>
      </div>

      <ComingSoon
        title="Volunteer Manager"
        description="Create volunteer sign-up forms, assign roles and shifts, communicate with volunteers, and track attendance and hours."
        icon={<HandHelping className="h-7 w-7" />}
      />
    </div>
  );
}
