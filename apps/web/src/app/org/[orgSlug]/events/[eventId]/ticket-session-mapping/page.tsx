import { Ticket } from "lucide-react";
import { ComingSoon } from "@/features/speakers/components/coming-soon";

export default function TicketSessionMappingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Ticket Session Mapping</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Control which sessions are accessible to each ticket type.
        </p>
      </div>

      <ComingSoon
        title="Ticket Session Mapping"
        description="Map ticket types to specific sessions so attendees only see and can RSVP to sessions included in their ticket. Manage access levels for workshops, VIP sessions, and add-on tracks."
        icon={<Ticket className="h-7 w-7" />}
      />
    </div>
  );
}
