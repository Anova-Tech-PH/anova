"use client";

import { useTransition } from "react";
import type { Announcement } from "@/features/announcements/queries";
import { deleteAnnouncement, sendAnnouncement } from "@/features/announcements/actions";

export function AnnouncementList({
  announcements,
  eventId,
}: {
  announcements: Announcement[];
  eventId: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSend(announcementId: string) {
    if (!window.confirm("Send this announcement to all recipients now?")) return;
    startTransition(async () => {
      await sendAnnouncement(eventId, announcementId);
    });
  }

  function handleDelete(announcementId: string) {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    startTransition(async () => {
      await deleteAnnouncement(eventId, announcementId);
    });
  }

  if (announcements.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 py-12 text-center text-muted-foreground">
        No announcements yet. Create one above to get started.
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left font-medium">Subject</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Sent Date</th>
              <th className="px-4 py-3 text-left font-medium">Read Count</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {announcements.map((a) => (
              <tr key={a.id} className="border-b last:border-b-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{a.subject}</td>
                <td className="px-4 py-3">
                  {a.status === "sent" ? (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">
                      Sent
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700">
                      Draft
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {a.sent_at
                    ? new Date(a.sent_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "\u2014"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{a.read_count ?? 0}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {a.status === "draft" && (
                      <button
                        type="button"
                        onClick={() => handleSend(a.id)}
                        disabled={isPending}
                        className="rounded-lg bg-foreground text-background px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50"
                      >
                        Send
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(a.id)}
                      disabled={isPending}
                      className="rounded-lg border px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
