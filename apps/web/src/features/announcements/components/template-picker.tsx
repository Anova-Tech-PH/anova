"use client";

import { ModalOverlay } from "@attendly/ui/components";
import { Button } from "@attendly/ui/components";
import { X, FileText, Inbox } from "lucide-react";
import type { Announcement, AnnouncementTemplate } from "@/features/announcements/queries";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").substring(0, 100);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface TemplatePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (subject: string, body: string) => void;
  mode: "reuse" | "org_templates";
  /** For "reuse" mode: previously sent announcements from the current event */
  sentAnnouncements?: Announcement[];
  /** For "org_templates" mode: templates from other events in the same org */
  orgTemplates?: AnnouncementTemplate[];
}

export function TemplatePicker({
  open,
  onClose,
  onSelect,
  mode,
  sentAnnouncements = [],
  orgTemplates = [],
}: TemplatePickerProps) {
  if (!open) return null;

  const title =
    mode === "reuse" ? "Reuse past announcement" : "From other organizers";

  const items =
    mode === "reuse"
      ? sentAnnouncements.map((a) => ({
          id: a.id,
          name: a.subject,
          subject: a.subject,
          body: a.body,
          date: a.sent_at ?? a.created_at,
        }))
      : orgTemplates.map((t) => ({
          id: t.id,
          name: t.name,
          subject: t.subject,
          body: t.body,
          date: t.created_at,
        }));

  function handleSelect(subject: string, body: string) {
    onSelect(subject, body);
    onClose();
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-lg rounded-xl border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* List */}
        <div className="max-h-[60vh] overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-muted-foreground">
              <Inbox className="h-10 w-10" />
              <p className="text-sm">
                {mode === "reuse"
                  ? "No past announcements to reuse."
                  : "No templates from other events yet."}
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item.subject, item.body)}
                    className="w-full px-6 py-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-start gap-3">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium leading-snug">
                          {item.name}
                        </p>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {stripHtml(item.body) || "No content"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(item.date)}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t px-6 py-4">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}
