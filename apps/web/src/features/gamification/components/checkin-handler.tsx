"use client";

import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

export function CheckinHandler({
  status,
  points,
  type,
}: {
  status: "success" | "already" | "invalid";
  points?: number;
  type?: string;
}) {
  const typeLabel = type === "exhibitor" ? "booth" : "session";

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      {status === "success" && (
        <>
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold">Checked In!</h1>
          <p className="mt-2 text-muted-foreground">
            You&apos;ve checked in to this {typeLabel}.
          </p>
          {points ? (
            <p
              className="mt-3 text-lg font-semibold"
              style={{ color: "oklch(0.445 0.107 195)" }}
            >
              +{points} points earned
            </p>
          ) : null}
        </>
      )}
      {status === "already" && (
        <>
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100">
            <AlertCircle className="h-10 w-10 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold">Already Checked In</h1>
          <p className="mt-2 text-muted-foreground">
            You&apos;ve already checked in to this {typeLabel}.
          </p>
        </>
      )}
      {status === "invalid" && (
        <>
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold">Invalid QR Code</h1>
          <p className="mt-2 text-muted-foreground">
            This QR code is not valid or has expired.
          </p>
        </>
      )}
    </div>
  );
}
