import { UserX } from "lucide-react";
import { ComingSoon } from "@/features/speakers/components/coming-soon";

export default function AbandonedRegistrationPage() {
  return (
    <ComingSoon
      title="Abandoned Registration Recovery"
      description="Automatically send retargeting emails to people who started but didn't complete registration. Track recovery rates and recovered ticket sales."
      icon={<UserX className="h-7 w-7" />}
    />
  );
}
