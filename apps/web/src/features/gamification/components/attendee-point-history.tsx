"use client";

import type { PointTransaction } from "@/features/gamification/queries";
import { X } from "lucide-react";

const ACTIVITY_LABELS: Record<string, string> = {
  poll_vote: "Poll Vote",
  session_feedback: "Session Feedback",
  session_rsvp: "Session RSVP",
  community_post: "Community Post",
  community_comment: "Community Comment",
  profile_update: "Profile Update",
  meetup_join: "Meetup Join",
  photo_upload: "Photo Upload",
  message_sent: "Message Sent",
  survey_complete: "Survey Complete",
};

export function AttendeePointHistory({
  transactions,
  attendeeName,
  onClose,
}: {
  transactions: PointTransaction[];
  attendeeName: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-lg font-semibold">{attendeeName}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Transaction list */}
        <div className="max-h-80 overflow-y-auto p-4">
          {transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No point transactions yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {transactions.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {ACTIVITY_LABELS[tx.activity_type] ?? tx.activity_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span
                    className="ml-4 shrink-0 text-sm font-semibold"
                    style={{ color: "oklch(0.445 0.107 195)" }}
                  >
                    +{tx.points}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
