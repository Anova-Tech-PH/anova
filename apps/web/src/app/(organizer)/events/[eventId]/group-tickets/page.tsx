import { Users } from "lucide-react";
import { ComingSoon } from "@/features/speakers/components/coming-soon";

export default function GroupTicketsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Group Tickets</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage group ticket types and bundle configurations.
        </p>
      </div>
      <ComingSoon
        title="Group Tickets"
        description="Create group ticket bundles that allow team leads to register multiple attendees at once. Configure group sizes and member information forms."
        icon={<Users className="h-7 w-7" />}
      />
    </div>
  );
}
