import { FileText } from "lucide-react";
import { ComingSoon } from "@/features/speakers/components/coming-soon";

export default function VolunteerConsentFormsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Release & Consent Forms</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage release and consent forms for event volunteers.
        </p>
      </div>

      <ComingSoon
        title="Volunteer Release & Consent Forms"
        description="Create and manage release waivers, photo consent forms, and other legal documents that volunteers must acknowledge before participating."
        icon={<FileText className="h-7 w-7" />}
      />
    </div>
  );
}
