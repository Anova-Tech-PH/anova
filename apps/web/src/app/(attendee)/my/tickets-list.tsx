"use client";

import { useState, useEffect } from "react";
import { Ticket, ChevronDown, ChevronUp } from "lucide-react";
import QRCode from "qrcode";
import { Card, Badge } from "@attendly/ui/components";

type Registration = {
  id: string;
  name: string;
  email: string;
  status: string;
  qr_code: string;
  created_at: string;
  ticket_types: { name: string; type: string; price: number }[] | null;
  events: {
    id: string;
    title: string;
    slug: string;
    start_date: string;
    end_date: string;
    venue_name: string | null;
    organizations: { slug: string }[];
  }[] | null;
};

const statusVariant: Record<string, "success" | "warning" | "default" | "primary"> = {
  confirmed: "success",
  checked_in: "primary",
  pending: "warning",
  cancelled: "default",
};

export function TicketsList({ registrations }: { registrations: Registration[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    registrations.forEach((reg) => {
      if (reg.status !== "cancelled") {
        QRCode.toDataURL(reg.qr_code, {
          width: 180,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        }).then((url) => {
          setQrUrls((prev) => ({ ...prev, [reg.id]: url }));
        });
      }
    });
  }, [registrations]);

  if (registrations.length === 0) {
    return (
      <div className="mt-12 flex flex-col items-center gap-3 text-center text-muted-foreground">
        <Ticket className="h-12 w-12 opacity-30" />
        <p className="text-lg font-medium">No tickets yet</p>
        <p className="text-sm">Register for an event to see your tickets here.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {registrations.map((reg) => {
        const expanded = expandedId === reg.id;
        const event = Array.isArray(reg.events) ? reg.events[0] : reg.events;
        const ticket = Array.isArray(reg.ticket_types) ? reg.ticket_types[0] : reg.ticket_types;
        const dateStr = event
          ? new Date(event.start_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "";

        return (
          <Card key={reg.id} className="overflow-hidden">
            <button
              onClick={() => setExpandedId(expanded ? null : reg.id)}
              className="w-full p-5 text-left"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{event?.title ?? "Event"}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {ticket?.name ?? "Ticket"} &middot; {dateStr}
                  </p>
                  {event?.venue_name && (
                    <p className="text-xs text-muted-foreground">{event.venue_name}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant[reg.status] ?? "default"}>
                    {reg.status}
                  </Badge>
                  {expanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </button>

            {expanded && reg.status !== "cancelled" && (
              <div className="border-t px-5 py-6 flex flex-col items-center gap-3">
                {qrUrls[reg.id] && (
                  <img
                    src={qrUrls[reg.id]}
                    alt="QR Code"
                    className="rounded-lg"
                    width={180}
                    height={180}
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Show this QR code at check-in
                </p>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
