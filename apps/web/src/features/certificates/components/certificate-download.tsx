"use client";

import { Award, Download, LogIn } from "lucide-react";
import { generateCertificatePdf } from "../generate-certificate";

export function CertificateDownload({
  eligible,
  loggedIn,
  registered,
  checkInCount,
  minCheckIns,
  attendeeName,
  eventTitle,
  orgName,
  startDate,
  endDate,
}: {
  eligible: boolean;
  loggedIn: boolean;
  registered: boolean;
  checkInCount: number;
  minCheckIns: number;
  attendeeName: string;
  eventTitle: string;
  orgName: string;
  startDate: string;
  endDate: string;
}) {
  function handleDownload() {
    const pdf = generateCertificatePdf({
      attendeeName,
      eventTitle,
      organizationName: orgName,
      eventStartDate: startDate,
      eventEndDate: endDate,
    });
    const blob = new Blob([pdf.buffer as ArrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificate-${attendeeName.toLowerCase().replace(/\s+/g, "-")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!loggedIn) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <LogIn className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">
          Please sign in to check your certificate eligibility.
        </p>
      </div>
    );
  }

  if (!registered) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <Award className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">
          You are not registered for this event.
        </p>
      </div>
    );
  }

  if (!eligible) {
    return (
      <div className="rounded-lg border p-8 text-center space-y-2">
        <Award className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium">Not yet eligible</p>
        <p className="text-sm text-muted-foreground">
          You have attended {checkInCount} of {minCheckIns} required sessions.
        </p>
        <div className="mx-auto mt-4 w-48">
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, (checkInCount / minCheckIns) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-8 text-center space-y-4">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <Award className="h-8 w-8 text-emerald-600" />
      </div>
      <div>
        <p className="text-lg font-semibold">Congratulations, {attendeeName}!</p>
        <p className="text-sm text-muted-foreground">
          You have met all the requirements for your certificate.
        </p>
      </div>
      <button
        onClick={handleDownload}
        className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-6 py-3 text-sm font-medium hover:opacity-90"
      >
        <Download className="h-4 w-4" /> Download Certificate (PDF)
      </button>
    </div>
  );
}
