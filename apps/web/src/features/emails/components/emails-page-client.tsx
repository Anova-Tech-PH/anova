"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Emails</h2>
        <Button onClick={() => setShowCompose(true)}>
          <Plus className="h-4 w-4" />
          Compose Email
        </Button>
      </div>

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
