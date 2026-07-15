"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import QRCode from "qrcode";
import { Card } from "@/shared/components/ui";

export function QrConfirmation({
  name,
  email,
  qrCode,
  ticketName,
}: {
  name: string;
  email: string;
  qrCode: string;
  ticketName: string;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(qrCode, {
      width: 200,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setQrDataUrl);
  }, [qrCode]);

  return (
    <div className="mt-8 space-y-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-light">
        <Check className="h-6 w-6 text-success" />
      </div>

      <div>
        <h2 className="text-xl font-semibold">You&apos;re registered!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A confirmation has been sent to {email}
        </p>
      </div>

      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Ticket</p>
        <p className="font-medium">{ticketName}</p>
        <p className="mt-1 text-sm">{name}</p>

        {qrDataUrl && (
          <div className="mt-4 flex justify-center">
            <img
              src={qrDataUrl}
              alt="Registration QR Code"
              className="rounded-lg"
              width={200}
              height={200}
            />
          </div>
        )}

        <p className="mt-2 text-xs text-muted-foreground">
          Show this QR code at check-in
        </p>
      </Card>
    </div>
  );
}
