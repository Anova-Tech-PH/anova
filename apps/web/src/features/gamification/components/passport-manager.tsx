"use client";

import { useState, useEffect } from "react";
import { QrCode, Building2 } from "lucide-react";
import { Card, EmptyState } from "@attendly/ui/components";
import { generateCheckinToken } from "../checkin-tokens";
import { generateQRCodeDataURL } from "../lib/qr";

type Sponsor = {
  id: string;
  name: string;
  logo_url: string | null;
};

export function PassportManager({
  eventId,
  sponsors,
  orgSlug,
  eventSlug,
}: {
  eventId: string;
  sponsors: Sponsor[];
  orgSlug: string;
  eventSlug: string;
}) {
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function generateCodes() {
      const codes: Record<string, string> = {};

      for (const sponsor of sponsors) {
        if (cancelled) return;

        try {
          const token = await generateCheckinToken(
            "exhibitor",
            sponsor.id,
            eventId
          );
          const url = `${window.location.origin}/${orgSlug}/${eventSlug}/checkin?type=exhibitor&id=${sponsor.id}&token=${token}`;
          const dataUrl = await generateQRCodeDataURL(url);
          codes[sponsor.id] = dataUrl;
        } catch {
          // Skip failed QR codes
        }
      }

      if (!cancelled) {
        setQrCodes(codes);
        setLoading(false);
      }
    }

    if (sponsors.length > 0) {
      generateCodes();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [sponsors, eventId, orgSlug, eventSlug]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Exhibitor Passport</h2>
        <p className="text-sm text-muted-foreground">
          Print and display these QR codes at each exhibitor booth. Attendees
          scan them to collect stamps and earn points.
        </p>
      </div>

      {sponsors.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8" />}
          title="No sponsors yet"
          description="Add sponsors to your event to enable the exhibitor passport feature."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sponsors.map((sponsor) => (
            <Card key={sponsor.id} className="p-4">
              <div className="flex flex-col items-center gap-3 text-center">
                {/* Sponsor logo or placeholder */}
                {sponsor.logo_url ? (
                  <img
                    src={sponsor.logo_url}
                    alt={sponsor.name}
                    className="h-12 w-12 rounded-lg object-contain"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}

                <h3 className="font-medium">{sponsor.name}</h3>

                {/* QR Code */}
                {loading ? (
                  <div className="flex h-[200px] w-[200px] items-center justify-center rounded-lg border bg-muted/30">
                    <QrCode className="h-8 w-8 animate-pulse text-muted-foreground" />
                  </div>
                ) : qrCodes[sponsor.id] ? (
                  <img
                    src={qrCodes[sponsor.id]}
                    alt={`QR code for ${sponsor.name}`}
                    className="h-[200px] w-[200px]"
                  />
                ) : (
                  <div className="flex h-[200px] w-[200px] items-center justify-center rounded-lg border bg-muted/30">
                    <p className="text-xs text-muted-foreground">
                      Failed to generate
                    </p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Scan to check in at this booth
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
