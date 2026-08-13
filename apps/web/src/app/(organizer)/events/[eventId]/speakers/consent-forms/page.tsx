import { FileText } from "lucide-react";
import { ComingSoon } from "@/features/speakers/components/coming-soon";

export default function ConsentFormsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Release &amp; Consent Forms</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Collect signed release and consent forms from your speakers.
        </p>
      </div>

      <ComingSoon
        title="Release & Consent Forms"
        description="Send and collect signed media release forms, consent agreements, and terms and conditions from your speakers before the event."
        icon={<FileText className="h-7 w-7" />}
      />
    </div>
  );
}
