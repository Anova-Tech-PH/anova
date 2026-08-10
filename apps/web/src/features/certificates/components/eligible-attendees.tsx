"use client";

import { useState, useTransition } from "react";
import { Award, Download } from "lucide-react";
import { issueCertificates } from "../actions";
import { generateCertificatePdf } from "../generate-certificate";

type Attendee = {
  id: string;
  name: string;
  email: string;
  ticket_types: { name: string } | { name: string }[];
};

type Issued = {
  registration_id: string;
  issued_at: string;
  emailed_at: string | null;
};

export function EligibleAttendees({
  eventId,
  eligible,
  issued,
  eventTitle,
  orgName,
  startDate,
  endDate,
  configId,
}: {
  eventId: string;
  eligible: Attendee[];
  issued: Issued[];
  eventTitle: string;
  orgName: string;
  startDate: string;
  endDate: string;
  configId: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const issuedSet = new Set(issued.map((i) => i.registration_id));
  const unissued = eligible.filter((a) => !issuedSet.has(a.id));

  function handleIssueAll() {
    startTransition(async () => {
      await issueCertificates(
        eventId,
        unissued.map((a) => a.id)
      );
    });
  }

  function handleDownloadSingle(attendee: Attendee) {
    const pdf = generateCertificatePdf({
      attendeeName: attendee.name,
      eventTitle,
      organizationName: orgName,
      eventStartDate: startDate,
      eventEndDate: endDate,
    });
    const blob = new Blob([pdf.buffer as ArrayBuffer], {
      type: "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificate-${attendee.name.toLowerCase().replace(/\s+/g, "-")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!configId) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <Award className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">
          Save a certificate configuration first to see eligible attendees.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Eligible Attendees ({eligible.length})
        </h3>
        {unissued.length > 0 && (
          <button
            onClick={handleIssueAll}
            disabled={isPending}
            className="rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {isPending
              ? "Issuing..."
              : `Issue ${unissued.length} Certificate${unissued.length !== 1 ? "s" : ""}`}
          </button>
        )}
      </div>

      {eligible.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No attendees meet the eligibility criteria yet.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {eligible.map((a) => {
                const wasIssued = issuedSet.has(a.id);
                return (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{a.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {a.email}
                    </td>
                    <td className="px-4 py-3">
                      {wasIssued ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <Award className="h-3 w-3" /> Issued
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDownloadSingle(a)}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Download className="h-3 w-3" /> Download PDF
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
