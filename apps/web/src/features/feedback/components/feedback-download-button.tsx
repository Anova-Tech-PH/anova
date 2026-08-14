"use client";

import { useTransition } from "react";
import { getEventFeedbackForExport } from "@/features/feedback/actions";
import { feedbackToCsv, downloadCsv } from "@/features/feedback/export";

export function FeedbackDownloadButton({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDownload() {
    startTransition(async () => {
      const { questions, responses } = await getEventFeedbackForExport(eventId);
      const csv = feedbackToCsv(questions, responses);
      downloadCsv(csv, `feedback-responses-${eventId}.csv`);
    });
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isPending}
      className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted/50 disabled:opacity-50"
    >
      {isPending ? "Exporting..." : "Download CSV"}
    </button>
  );
}
