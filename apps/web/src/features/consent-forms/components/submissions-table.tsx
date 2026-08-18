"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Bell,
  Download,
  FileText,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Card, CardContent } from "@attendly/ui/components";
import {
  sendConsentFormEmails,
  sendConsentFormReminders,
  exportSubmissionsCsv,
} from "../actions";
import type { ConsentFormSubmission, ConsentForm } from "../queries";

interface SubmissionsTableProps {
  eventId: string;
  formId: string;
  submissions: ConsentFormSubmission[];
  formStatus: ConsentForm["status"];
}

export function SubmissionsTable({
  eventId,
  formId,
  submissions,
  formStatus,
}: SubmissionsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSendForm() {
    startTransition(async () => {
      try {
        const count = await sendConsentFormEmails(eventId, formId, []);
        toast.success(`Form sent to ${count} recipient(s)`);
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to send form"
        );
      }
    });
  }

  function handleSendReminders() {
    startTransition(async () => {
      try {
        const count = await sendConsentFormReminders(eventId, formId);
        if (count === 0) {
          toast.info("All participants have already signed the form");
        } else {
          toast.success(`Reminders sent to ${count} participant(s)`);
        }
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to send reminders"
        );
      }
    });
  }

  function handleExportCsv() {
    startTransition(async () => {
      try {
        const csv = await exportSubmissionsCsv(eventId, formId);
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `consent-form-submissions-${formId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV exported");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to export CSV"
        );
      }
    });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSendForm}
          disabled={isPending || formStatus !== "published"}
        >
          <Send className="mr-2 h-4 w-4" />
          Send Form
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSendReminders}
          disabled={isPending || formStatus !== "published"}
        >
          <Bell className="mr-2 h-4 w-4" />
          Send Reminders
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          disabled={isPending || submissions.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Stats Card */}
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{submissions.length}</p>
            <p className="text-sm text-muted-foreground">
              Total {submissions.length === 1 ? "Submission" : "Submissions"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {submissions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Inbox className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold">No submissions yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {formStatus === "published"
                ? "Share the form link with participants to start collecting submissions."
                : "Publish the form first to start collecting submissions."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">
                  Signed Name
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  Signed Date
                </th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => (
                <tr key={sub.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{sub.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {sub.email}
                  </td>
                  <td className="px-4 py-3">{sub.signed_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(sub.signed_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
