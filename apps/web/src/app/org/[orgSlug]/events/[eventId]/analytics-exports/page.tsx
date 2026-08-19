import { BarChart3 } from "lucide-react";
import { ComingSoon } from "@/features/speakers/components/coming-soon";

export default function AnalyticsExportsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Analytics & Exports</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          View attendee analytics, generate reports, and export attendee data.
        </p>
      </div>

      <ComingSoon
        title="Analytics & Exports"
        description="View detailed attendee analytics, track registration trends, and export attendee lists and reports in various formats."
        icon={<BarChart3 className="h-7 w-7" />}
      />
    </div>
  );
}
