import { Users } from "lucide-react";
import { ComingSoon } from "@/features/speakers/components/coming-soon";

export default function LeadRetrievalPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Lead Retrieval</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Track and manage sponsor lead collection from booth visits and interactions.
        </p>
      </div>

      <ComingSoon
        title="Lead Retrieval"
        description="Allow sponsors to scan attendee badges and collect leads at their booths. View lead reports, export contact lists, and track sponsor engagement."
        icon={<Users className="h-7 w-7" />}
      />
    </div>
  );
}
