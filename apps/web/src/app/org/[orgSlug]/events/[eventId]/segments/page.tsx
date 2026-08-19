import { Filter } from "lucide-react";
import { ComingSoon } from "@/features/speakers/components/coming-soon";

export default function SegmentsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Segments</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create attendee segments for targeted communication and reporting.
        </p>
      </div>

      <ComingSoon
        title="Segments"
        description="Group attendees into segments based on ticket type, registration date, custom fields, or other criteria. Use segments for targeted emails, reports, and access control."
        icon={<Filter className="h-7 w-7" />}
      />
    </div>
  );
}
