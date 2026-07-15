"use client";

import { useState } from "react";
import { Check, Ticket } from "lucide-react";
import { toast } from "sonner";
import { registerForEvent } from "@/features/registration/actions";
import { QrConfirmation } from "./qr-confirmation";
import { Input, Button } from "@/shared/components/ui";

type TicketType = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  price: number;
  available: number | null;
};

export function RegistrationFlow({
  eventId,
  tickets,
}: {
  eventId: string;
  tickets: TicketType[];
}) {
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    qr_code: string;
    name: string;
    email: string;
  } | null>(null);

  const selected = tickets.find((t) => t.id === selectedTicket);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTicket) return;
    setLoading(true);

    try {
      const reg = await registerForEvent({
        event_id: eventId,
        ticket_type_id: selectedTicket,
        name,
        email,
      });
      setConfirmation(reg);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (confirmation) {
    return (
      <QrConfirmation
        name={confirmation.name}
        email={confirmation.email}
        qrCode={confirmation.qr_code}
        ticketName={selected?.name ?? ""}
      />
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {/* Step 1: Select ticket */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium">Select a ticket</h2>
        {tickets.map((ticket) => {
          const soldOut = ticket.available !== null && ticket.available <= 0;
          return (
            <button
              key={ticket.id}
              onClick={() => !soldOut && setSelectedTicket(ticket.id)}
              disabled={soldOut}
              className={`w-full rounded-xl border p-4 text-left transition-colors ${
                selectedTicket === ticket.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : soldOut
                    ? "cursor-not-allowed opacity-50"
                    : "hover:border-foreground/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                      selectedTicket === ticket.id
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {selectedTicket === ticket.id && (
                      <Check className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{ticket.name}</p>
                    {ticket.description && (
                      <p className="text-xs text-muted-foreground">{ticket.description}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {ticket.type === "free" ? "Free" : `$${ticket.price}`}
                  </p>
                  {soldOut ? (
                    <p className="text-xs text-destructive">Sold out</p>
                  ) : ticket.available !== null ? (
                    <p className="text-xs text-muted-foreground">
                      {ticket.available} left
                    </p>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Step 2: Fill form */}
      {selectedTicket && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-sm font-medium">Your information</h2>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Full name *</label>
            <Input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email *</label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <Button
            type="submit"
            disabled={!name || !email}
            loading={loading}
            className="w-full"
          >
            {loading ? "Registering..." : "Complete Registration"}
          </Button>
        </form>
      )}
    </div>
  );
}
