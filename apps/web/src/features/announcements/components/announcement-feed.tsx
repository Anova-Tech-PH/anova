"use client";

import { useEffect } from "react";
import { Megaphone } from "lucide-react";
import { markAnnouncementRead } from "../actions";

type Announcement = {
  id: string;
  subject: string;
  body: string;
  sent_at: string | null;
  read_count: number;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AnnouncementFeed({
  announcements,
  readIds,
}: {
  announcements: Announcement[];
  readIds: Set<string>;
}) {
  // Mark all unread announcements as read on mount
  useEffect(() => {
    const unread = announcements.filter((a) => !readIds.has(a.id));
    unread.forEach((a) => markAnnouncementRead(a.id));
  }, [announcements, readIds]);

  if (announcements.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <Megaphone className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">No announcements yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {announcements.map((a) => {
        const isUnread = !readIds.has(a.id);
        return (
          <article
            key={a.id}
            className={`rounded-lg border p-4 transition-colors ${
              isUnread ? "border-primary/30 bg-primary/5" : "bg-card"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-primary/10 p-2">
                  <Megaphone className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-medium leading-snug">
                    {isUnread && (
                      <span className="mr-2 inline-block h-2 w-2 rounded-full bg-primary" />
                    )}
                    {a.subject}
                  </h3>
                  <div
                    className="text-sm text-muted-foreground prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: a.body }}
                  />
                </div>
              </div>
              {a.sent_at && (
                <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                  {timeAgo(a.sent_at)}
                </span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
