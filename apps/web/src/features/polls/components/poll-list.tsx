"use client";

import { useState, useTransition } from "react";
import type { PollWithResults } from "@/features/polls/queries";
import { useConfirm } from "@attendly/ui/components";
import { openPoll, closePoll, deletePoll, togglePollResults } from "@/features/polls/actions";
import { PollResultsChart } from "./poll-results-chart";
import { pollsToCsv, downloadCsv } from "@/features/polls/export";

export function PollList({
  polls,
  eventId,
  orgSlug,
  eventSlug,
}: {
  polls: PollWithResults[];
  eventId: string;
  orgSlug: string;
  eventSlug: string;
}) {
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function handleOpen(pollId: string) {
    startTransition(async () => {
      await openPoll(eventId, pollId);
    });
  }

  function handleClose(pollId: string) {
    startTransition(async () => {
      await closePoll(eventId, pollId);
    });
  }

  async function handleDelete(pollId: string) {
    const ok = await confirm({
      title: "Delete Poll",
      description: "Are you sure you want to delete this poll? This action cannot be undone.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    startTransition(async () => {
      await deletePoll(eventId, pollId);
    });
  }

  function handleToggleResults(pollId: string, currentShow: boolean) {
    startTransition(async () => {
      await togglePollResults(eventId, pollId, !currentShow);
    });
  }

  function handleDownloadCsv() {
    const csv = pollsToCsv(polls);
    downloadCsv(csv, "poll-results.csv");
  }

  if (polls.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 py-12 text-center text-muted-foreground">
        No polls yet. Create one above to get started.
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="flex items-center justify-end px-4 py-2 border-b bg-muted/10">
        <button
          type="button"
          onClick={handleDownloadCsv}
          className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted/50"
        >
          Download CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left font-medium">Question</th>
              <th className="px-4 py-3 text-left font-medium">Session</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Votes</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {polls.map((poll) => (
              <>
                <tr
                  key={poll.id}
                  className="border-b last:border-b-0 hover:bg-muted/20"
                >
                  <td className="px-4 py-3 font-medium">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId((prev) =>
                          prev === poll.id ? null : poll.id
                        )
                      }
                      className="text-left hover:underline"
                    >
                      {poll.question}
                    </button>
                    {poll.answer_type && poll.answer_type !== "multiple_choice" && (
                      <span className="ml-2 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                        {poll.answer_type.replace("_", " ")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {poll.session_title ?? "\u2014"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={poll.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {poll.total_votes}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {poll.status === "draft" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpen(poll.id)}
                            disabled={isPending}
                            className="rounded-lg bg-foreground text-background px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50"
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(poll.id)}
                            disabled={isPending}
                            className="rounded-lg border px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </>
                      )}
                      {poll.status === "open" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleClose(poll.id)}
                            disabled={isPending}
                            className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted/50 disabled:opacity-50"
                          >
                            Close
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleResults(poll.id, poll.show_results)
                            }
                            disabled={isPending}
                            className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted/50 disabled:opacity-50"
                          >
                            {poll.show_results
                              ? "Hide Results"
                              : "Show Results"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const url = `${window.location.origin}/${orgSlug}/${eventSlug}/polls/${poll.id}/present`;
                              window.open(url, "_blank");
                            }}
                            className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted/50"
                          >
                            Present
                          </button>
                        </>
                      )}
                      {poll.status === "closed" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpen(poll.id)}
                            disabled={isPending}
                            className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted/50 disabled:opacity-50"
                          >
                            Reopen
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const url = `${window.location.origin}/${orgSlug}/${eventSlug}/polls/${poll.id}/present`;
                              window.open(url, "_blank");
                            }}
                            className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted/50"
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(poll.id)}
                            disabled={isPending}
                            className="rounded-lg border px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedId === poll.id && (
                  <tr key={`${poll.id}-results`} className="border-b last:border-b-0">
                    <td colSpan={5} className="px-6 py-4 bg-muted/10">
                      <PollResultsChart poll={poll} />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {confirmDialog}
    </div>
  );
}

function StatusBadge({ status }: { status: "draft" | "open" | "closed" }) {
  const styles = {
    draft: "bg-gray-100 text-gray-700",
    open: "bg-green-100 text-green-700",
    closed: "bg-red-100 text-red-700",
  };

  const labels = {
    draft: "Draft",
    open: "Open",
    closed: "Closed",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
