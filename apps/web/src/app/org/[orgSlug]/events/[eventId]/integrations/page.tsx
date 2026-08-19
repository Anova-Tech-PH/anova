import { Plug } from "lucide-react";
import { ComingSoon } from "@/features/speakers/components/coming-soon";

export default function IntegrationsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Integrations</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect third-party tools and services to your event.
        </p>
      </div>

      <ComingSoon
        title="Integrations"
        description="Connect your event with CRM systems, marketing platforms, payment processors, and other third-party tools. Sync attendee data, automate workflows, and extend your event capabilities."
        icon={<Plug className="h-7 w-7" />}
      />
    </div>
  );
}
