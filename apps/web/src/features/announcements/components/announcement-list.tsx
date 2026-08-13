"use client";

import { useState, useTransition } from "react";
import { Button, useConfirm } from "@attendly/ui/components";
import { Pencil, Trash2, MoreHorizontal, Eye, Copy, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import type { Announcement } from "@/features/announcements/queries";
import { deleteAnnouncement } from "@/features/announcements/actions";
import { AnnouncementDetailModal } from "./announcement-detail-modal";

// ---------------------------------------------------------------------------
// Audience label helper
// ---------------------------------------------------------------------------

export function audienceLabel(audience: { type: string }): string {
  const labels: Record<string, string> = {
    all: "All attendees",
    ticket_types: "By ticket type",
    category: "By category",
    segment: "By segment",
    session_attendees: "By session",
    manual: "Manual selection",
    exclude_categories: "All except categories",
  };
  return labels[audience.type] ?? audience.type;
}

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

function Pagination({
  total,
  page,
  pageSize,
  label,
}: {
  total: number;
  page: number;
  pageSize: number;
  label: string;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  // Build URL with updated page param
  function pageUrl(p: number) {
    if (typeof window === "undefined") return "#";
    const url = new URL(window.location.href);
    url.searchParams.set("page", String(p));
    return url.toString();
  }

  return (
    <div className="flex items-center justify-between border-t px-4 py-3">
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages} ({total} {label})
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => {
            window.location.href = pageUrl(page - 1);
          }}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => {
            window.location.href = pageUrl(page + 1);
          }}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Actions dropdown for sent announcements
// ---------------------------------------------------------------------------

function SentActionsDropdown({
  announcement,
  onViewDetails,
  onDuplicate,
  onDelete,
}: {
  announcement: Announcement;
  onViewDetails: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      {open && (
        <>
          {/* Invisible backdrop to close dropdown */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border bg-popover py-1 shadow-lg">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
              onClick={() => {
                setOpen(false);
                onViewDetails();
              }}
            >
              <Eye className="h-4 w-4" />
              View details
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
              onClick={() => {
                setOpen(false);
                onDuplicate();
              }}
            >
              <Copy className="h-4 w-4" />
              Copy and compose new
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AnnouncementList
// ---------------------------------------------------------------------------

interface AnnouncementListProps {
  drafts: Announcement[];
  sent: Announcement[];
  totalDrafts: number;
  totalSent: number;
  eventId: string;
  page: number;
  pageSize: number;
  onEditDraft: (draft: Announcement) => void;
  onDuplicate: (announcement: Announcement) => void;
}

export function AnnouncementList({
  drafts,
  sent,
  totalDrafts,
  totalSent,
  eventId,
  page,
  pageSize,
  onEditDraft,
  onDuplicate,
}: AnnouncementListProps) {
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [detailAnnouncement, setDetailAnnouncement] =
    useState<Announcement | null>(null);

  async function handleDelete(announcementId: string) {
    const ok = await confirm({
      title: "Delete Announcement",
      description:
        "Are you sure you want to delete this announcement? This action cannot be undone.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteAnnouncement(eventId, announcementId);
        toast.success("Announcement deleted");
      } catch {
        toast.error("Failed to delete announcement");
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* ----------------------------------------------------------------- */}
      {/* Drafts Section                                                     */}
      {/* ----------------------------------------------------------------- */}
      <section>
        <h3 className="mb-3 text-base font-semibold">Drafts</h3>

        {drafts.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/20 py-8 text-center text-sm text-muted-foreground">
            No drafts
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium">
                      Subject
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Send to
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Time created
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((draft) => (
                    <tr
                      key={draft.id}
                      className="border-b last:border-b-0 hover:bg-muted/20"
                    >
                      <td className="px-4 py-3 font-medium">
                        {draft.subject}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {audienceLabel(draft.target_audience)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(draft.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEditDraft(draft)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(draft.id)}
                            disabled={isPending}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              total={totalDrafts}
              page={page}
              pageSize={pageSize}
              label="drafts"
            />
          </div>
        )}
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Sent Section                                                       */}
      {/* ----------------------------------------------------------------- */}
      <section>
        <h3 className="mb-3 text-base font-semibold">Sent</h3>

        {sent.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/20 py-8 text-center text-sm text-muted-foreground">
            No sent announcements
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium">
                      Subject
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Sent to
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Time sent
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sent.map((announcement) => (
                    <tr
                      key={announcement.id}
                      className="border-b last:border-b-0 hover:bg-muted/20"
                    >
                      <td className="px-4 py-3 font-medium">
                        {announcement.subject}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {audienceLabel(announcement.target_audience)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(announcement.sent_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end">
                          <SentActionsDropdown
                            announcement={announcement}
                            onViewDetails={() =>
                              setDetailAnnouncement(announcement)
                            }
                            onDuplicate={() => onDuplicate(announcement)}
                            onDelete={() => handleDelete(announcement.id)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              total={totalSent}
              page={page}
              pageSize={pageSize}
              label="sent"
            />
          </div>
        )}
      </section>

      {/* Confirm dialog portal */}
      {confirmDialog}

      {/* Detail modal */}
      {detailAnnouncement && (
        <AnnouncementDetailModal
          announcement={detailAnnouncement}
          open={!!detailAnnouncement}
          onClose={() => setDetailAnnouncement(null)}
          onDuplicate={() => {
            onDuplicate(detailAnnouncement);
            setDetailAnnouncement(null);
          }}
        />
      )}
    </div>
  );
}
