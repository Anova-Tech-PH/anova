"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@attendly/ui/components";
import { ComposeEmail } from "./compose-email";

type TicketType = {
  id: string;
  name: string;
};

export function EmailsPageClient({
  eventId,
  ticketTypes,
}: {
  eventId: string;
  ticketTypes: TicketType[];
}) {
  const [showCompose, setShowCompose] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setShowCompose(true)}>
        <Plus className="h-4 w-4" />
        Quick Broadcast
      </Button>

      {showCompose && (
        <ComposeEmail
          eventId={eventId}
          ticketTypes={ticketTypes}
          onClose={() => setShowCompose(false)}
          onSent={() => window.location.reload()}
        />
      )}
    </>
  );
}
