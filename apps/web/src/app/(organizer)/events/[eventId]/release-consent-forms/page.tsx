import { FileText } from "lucide-react";
import { ComingSoon } from "@/features/speakers/components/coming-soon";

export default function ReleaseConsentFormsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Release & Consent Forms</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage release waivers and consent forms for attendees.
        </p>
      </div>

      <ComingSoon
        title="Release & Consent Forms"
        description="Create and manage photo/video release waivers, liability disclaimers, and consent forms that attendees must sign during registration or check-in."
        icon={<FileText className="h-7 w-7" />}
      />
    </div>
  );
}
