"use client";

import { ModalOverlay } from "@attendly/ui/components";
import { Button } from "@attendly/ui/components";
import { RichTextEditor } from "@/shared/components/rich-text-editor";
import { X, Copy } from "lucide-react";
import type { Announcement } from "@/features/announcements/queries";
import { audienceLabel } from "./announcement-list";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface AnnouncementDetailModalProps {
  announcement: Announcement;
  open: boolean;
  onClose: () => void;
  onDuplicate: () => void;
}

export function AnnouncementDetailModal({
  announcement,
  open,
  onClose,
  onDuplicate,
}: AnnouncementDetailModalProps) {
  if (!open) return null;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-2xl rounded-xl border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b px-6 py-4">
          <div className="space-y-1 pr-4">
            <h2 className="text-lg font-semibold">{announcement.subject}</h2>
            <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
              <span>
                Sent to: {audienceLabel(announcement.target_audience)}
              </span>
              <span>Sent at: {formatDate(announcement.sent_at)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          <RichTextEditor
            content={announcement.body}
            onChange={() => {}}
            readOnly
          />
        </div>

        {/* Sender info */}
        {(announcement.sender_name || announcement.reply_to_email) && (
          <div className="border-t px-6 py-3 text-sm text-muted-foreground">
            {announcement.sender_name && (
              <p>
                Sender: <span className="text-foreground">{announcement.sender_name}</span>
              </p>
            )}
            {announcement.reply_to_email && (
              <p>
                Reply-to: <span className="text-foreground">{announcement.reply_to_email}</span>
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={onDuplicate}>
            <Copy className="h-4 w-4" />
            Copy and compose new
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}
