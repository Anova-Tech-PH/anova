import { BarChart3 } from "lucide-react";
import { ComingSoon } from "@/features/speakers/components/coming-soon";

export default function CrossEventReportPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Cross-Event Report</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Compare attendee data and metrics across multiple events.
        </p>
      </div>

      <ComingSoon
        title="Cross-Event Report"
        description="Generate reports comparing attendee engagement, registration numbers, and demographics across your events to identify trends and optimize future planning."
        icon={<BarChart3 className="h-7 w-7" />}
      />
    </div>
  );
}
